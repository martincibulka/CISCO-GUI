"use client";

import { useState, useEffect, useRef } from "react";
import EditModal from "./EditModal";
import ConnectModal from "./ConnectModal";
const pad = (str, len) => {
  const s = str || "";
  if (s.length >= len) {
    return s + " ";
  }
  return s.padEnd(len, " ");
};

const reformatLines = (lines, dbPorts) => {
  return lines.map(line => {
    if (line.trim().startsWith("Port") && line.includes("Status") && line.includes("Vlan")) {
      return "Port      Name                                                  Status       Vlan       Duplex  Speed";
    }
    const portMatch = line.match(/^([A-Za-z]+\d+(?:\/\d+)*)\s/);
    if (portMatch) {
      const portName = portMatch[1];
      const statusMatch = line.match(/(connected|notconnect|disabled|err-disable)/);
      if (statusMatch) {
        const status = statusMatch[1];
        const afterStatus = line.substring(statusMatch.index + status.length).trim().split(/\s+/);
        const vlan = afterStatus[0] || "";
        
        let rawName = portName;
        if (/^g[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^g[a-z]*\s*(\d+.*)/i, 'Gi$1');
        else if (/^f[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^f[a-z]*\s*(\d+.*)/i, 'Fa$1');
        else if (/^t[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^t[a-z]*\s*(\d+.*)/i, 'Te$1');

        const dbPort = dbPorts[rawName];
        let description = dbPort ? dbPort.description : line.substring(portName.length, statusMatch.index).trim();
        
        if (description.length > 50) {
          description = description.substring(0, 50);
        }
        
        const duplex = afterStatus[1] || "";
        const speed = afterStatus[2] || "";
        
        return `${pad(portName, 9)}${pad(description, 51)}${pad(status, 13)}${pad(vlan, 11)}${pad(duplex, 8)}${speed}`;
      }
    }
    return line;
  });
};

export default function Pane({ title }) {
  const [ipAddress, setIpAddress] = useState("");
  const [switches, setSwitches] = useState([]);
  const [selectedSwitch, setSelectedSwitch] = useState("");
  const [logs, setLogs] = useState([`[System] Initializing ${title}...`, "[System] Ready."]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, port: null, name: '', status: '', vlan: '', mac: '', portSecurity: '0' });
  const [selectedPortIndex, setSelectedPortIndex] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: null, y: null });
  const [vlans, setVlans] = useState([]);
  const [vlanEditorOpen, setVlanEditorOpen] = useState(false);
  const [newVlanId, setNewVlanId] = useState('');
  const [newVlanName, setNewVlanName] = useState('');
  const [dbPorts, setDbPorts] = useState({});

  const fetchDbPorts = async (switchId) => {
    if (!switchId) {
      setDbPorts({});
      return;
    }
    try {
      const res = await fetch(`/api/switches/${switchId}/ports`);
      if (res.ok) {
        const data = await res.json();
        const portMap = {};
        data.forEach(p => {
          portMap[p.port_name] = p;
        });
        setDbPorts(portMap);
      }
    } catch (e) {
      console.error('Failed to fetch db ports', e);
    }
  };

  useEffect(() => {
    if (selectedSwitch) {
      fetchDbPorts(selectedSwitch);
    } else {
      setDbPorts({});
    }
  }, [selectedSwitch]);

  const inputRef = useRef(null);
  const contentRef = useRef(null);
  const contextMenuRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const stateRef = useRef({ logs, selectedPortIndex });
  const cliContextRef = useRef({ interface: null });

  useEffect(() => {
    stateRef.current = { logs, selectedPortIndex };
  }, [logs, selectedPortIndex]);

  useEffect(() => {
    fetchSwitches();
    fetchVlans();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.context-menu')) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchSwitches = async () => {
    try {
      const res = await fetch("/api/switches");
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        setSwitches(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVlans = async () => {
    try {
      const res = await fetch('/api/vlans');
      if (res.ok) {
        const data = await res.json();
        setVlans(data);
      }
    } catch (e) {
      console.error('Failed to fetch VLANs', e);
    }
  };

  const handleAddVlan = async () => {
    const id = Number(newVlanId);
    if (!id || id < 1 || id > 4094) {
      alert('Zadajte platné číslo VLAN (1–4094).');
      return;
    }
    try {
      const res = await fetch('/api/vlans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vlan_id: id, name: newVlanName })
      });
      if (res.ok) {
        setNewVlanId('');
        setNewVlanName('');
        await fetchVlans();
      } else {
        const err = await res.json();
        alert(err.error || 'Chyba pri pridávaní VLAN.');
      }
    } catch (e) {
      console.error('Failed to add VLAN', e);
    }
  };

  const handleDeleteVlan = async (vlanId) => {
    try {
      const res = await fetch('/api/vlans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vlan_id: vlanId })
      });
      if (res.ok) {
        await fetchVlans();
      }
    } catch (e) {
      console.error('Failed to delete VLAN', e);
    }
  };

  const handleSelectChange = (e) => {
    const val = e.target.value;
    setSelectedSwitch(val);
    if (val) {
      const sw = switches.find((s) => s.id.toString() === val);
      if (sw) {
        setIpAddress(sw.ip_address);
      }
    } else {
      setIpAddress("");
    }
  };

  const handleConnect = async () => {
    if (!ipAddress) return;
    
    const exists = switches.find((s) => s.ip_address === ipAddress);
    if (exists && exists.username && exists.password) {
      initiateConnection(exists);
    } else {
      setIsConnectModalOpen(true);
    }
  };

  const handleConnectSubmit = async (credentials) => {
    setIsConnectModalOpen(false);
    
    let switchData = switches.find((s) => s.ip_address === ipAddress);
    
    if (credentials.remember || !switchData) {
      const endpoint = switchData ? `/api/switches/${switchData.id}` : "/api/switches";
      const method = switchData ? "PUT" : "POST";
      const body = {
        name: switchData ? switchData.name : `Switch ${ipAddress}`,
        ip_address: ipAddress,
        username: credentials.remember ? credentials.username : (switchData?.username || null),
        password: credentials.remember ? credentials.password : (switchData?.password || null),
        enable_password: credentials.remember ? credentials.enablePassword : (switchData?.enable_password || null)
      };

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          await fetchSwitches();
          const updatedSwitches = await (await fetch("/api/switches")).json();
          switchData = updatedSwitches.find(s => s.ip_address === ipAddress);
        }
      } catch (e) {
        console.error("Failed to save credentials", e);
      }
    }

    initiateConnection({
      ...switchData, 
      ip_address: ipAddress,
      username: credentials.username, 
      password: credentials.password, 
      enable_password: credentials.enablePassword
    });
  };

  const initiateConnection = async (switchCredentials) => {
    setLogs((prev) => [...prev, `[System] Connecting to ${switchCredentials.ip_address} as ${switchCredentials.username}...`]);
    setIsConnected(false);
    
    if (switchCredentials.id) {
      setSelectedSwitch(switchCredentials.id.toString());
    }
    
    try {
      const res = await fetch("/api/ssh/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: switchCredentials.ip_address,
          username: switchCredentials.username,
          password: switchCredentials.password
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLogs((prev) => [...prev, `[System] Connected successfully. Syncing descriptions...`]);
        setIsConnected(true);
        
        let targetSwitchId = switchCredentials.id;
        if (!targetSwitchId) {
          try {
            const swList = await (await fetch("/api/switches")).json();
            const sw = swList.find(s => s.ip_address === switchCredentials.ip_address);
            if (sw) targetSwitchId = sw.id;
          } catch (e) {
            console.error("Failed to load switches list", e);
          }
        }

        if (targetSwitchId) {
          try {
            const descOutput = await fetchCommandOutput("sh int desc", switchCredentials.ip_address);
            if (descOutput) {
              const descLines = descOutput.split('\n').filter(l => l.trim() !== "");
              const parsedDescriptions = [];
              descLines.forEach(line => {
                const portMatch = line.match(/^([A-Za-z]+\d+(?:\/\d+)*)\s+/);
                if (portMatch) {
                  const portName = portMatch[1];
                  const statusProtoMatch = line.match(/\s+(up|down|admin\s+down)\s+(up|down)\s+/i);
                  if (statusProtoMatch) {
                    const descPart = line.substring(statusProtoMatch.index + statusProtoMatch[0].length).trim();
                    
                    let rawName = portName;
                    if (/^g[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^g[a-z]*\s*(\d+.*)/i, 'Gi$1');
                    else if (/^f[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^f[a-z]*\s*(\d+.*)/i, 'Fa$1');
                    else if (/^t[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^t[a-z]*\s*(\d+.*)/i, 'Te$1');

                    parsedDescriptions.push({
                      port_name: rawName,
                      description: descPart
                    });
                  }
                }
              });
              
              if (parsedDescriptions.length > 0) {
                await fetch(`/api/switches/${targetSwitchId}/ports/bulk`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ports: parsedDescriptions })
                });
                await fetchDbPorts(targetSwitchId);
              }
            }
          } catch (e) {
            console.error("Desc sync error", e);
          }
        }

        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
          executeCommand("sh int status", switchCredentials.ip_address);
        }, 100);
      } else {
        setLogs((prev) => [...prev, `[System] Connection failed: ${data.error}`]);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `[System] Connection error: ${e.message}`]);
    }
  };

  const executeCommand = async (cmd, targetIp = ipAddress) => {
    if (!cmd.trim()) return;
    setCommand("");
    
    const cmds = cmd.split('\n').filter(c => c.trim() !== "");
    for (const singleCmd of cmds) {
      setLogs((prev) => [...prev, `> ${singleCmd}`]);

      // CLI Background Sync Logic
      const intRangeMatch = singleCmd.match(/^(?:interface|int)\s+range/i);
      if (intRangeMatch) {
        cliContextRef.current.interface = null;
      } else {
        const intMatch = singleCmd.match(/^(?:interface|int)\s+([a-zA-Z0-9\/\-]+)/i);
        if (intMatch) {
          let rawName = intMatch[1];
          if (/^g[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^g[a-z]*\s*(\d+.*)/i, 'Gi$1');
          else if (/^f[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^f[a-z]*\s*(\d+.*)/i, 'Fa$1');
          else if (/^t[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^t[a-z]*\s*(\d+.*)/i, 'Te$1');
          cliContextRef.current.interface = rawName;
        }
      }

      if (singleCmd.match(/^(?:exit|end|write|copy)/i)) {
        cliContextRef.current.interface = null;
      }

      const currentInterface = cliContextRef.current.interface;
      if (currentInterface && selectedSwitch) {
        let dbUpdates = null;
        
        const descMatch = singleCmd.match(/^(?:description|desc)\s+(.+)/i);
        if (descMatch) dbUpdates = { ...dbUpdates, description: descMatch[1].trim() };
        
        const noDescMatch = singleCmd.match(/^no\s+(?:description|desc)/i);
        if (noDescMatch) dbUpdates = { ...dbUpdates, description: "" };

        const vlanMatch = singleCmd.match(/^(?:switchport|sw)\s+(?:access|acc)\s+(?:vlan|vl)\s+(\d+)/i);
        if (vlanMatch) dbUpdates = { ...dbUpdates, vlan: vlanMatch[1] };

        const noVlanMatch = singleCmd.match(/^no\s+(?:switchport|sw)\s+(?:access|acc)\s+(?:vlan|vl)/i);
        if (noVlanMatch) dbUpdates = { ...dbUpdates, vlan: "" };

        const statusMatch = singleCmd.match(/^shutdown/i);
        if (statusMatch) dbUpdates = { ...dbUpdates, status: 'disabled' };
        
        const noStatusMatch = singleCmd.match(/^no\s+shutdown/i);
        if (noStatusMatch) dbUpdates = { ...dbUpdates, status: 'enabled' };
        
        const portSecMatch = singleCmd.match(/^(?:switchport|sw)\s+port-security\s+maximum\s+(\d+)/i);
        if (portSecMatch) dbUpdates = { ...dbUpdates, port_security: portSecMatch[1] };

        const noPortSecMatch = singleCmd.match(/^no\s+(?:switchport|sw)\s+port-security/i);
        if (noPortSecMatch) dbUpdates = { ...dbUpdates, port_security: '0' };

        if (dbUpdates) {
          fetch(`/api/switches/${selectedSwitch}/ports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ port_name: currentInterface, ...dbUpdates })
          }).catch(e => console.error("CLI sync error", e));
        }
      }
      
      try {
        const res = await fetch("/api/ssh/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip_address: targetIp, command: singleCmd })
        });
        const data = await res.json();
        
        if (res.ok) {
          const lines = data.output.split('\n').filter(l => l.trim() !== "");
          if (lines.length > 0) {
            const reformatted = reformatLines(lines, dbPorts);
            setLogs((prev) => [...prev, ...reformatted]);
            
            const parsedPorts = [];
            lines.forEach(line => {
              const portMatch = line.match(/^([A-Za-z]+\d+(?:\/\d+)*)\s/);
              if (portMatch) {
                const portName = portMatch[1];
                const statusMatch = line.match(/(connected|notconnect|disabled|err-disable)/);
                if (statusMatch) {
                  const status = statusMatch[1];
                  const afterStatus = line.substring(statusMatch.index + status.length).trim().split(/\s+/);
                  const vlan = afterStatus[0] || "";
                  const namePart = line.substring(portName.length, statusMatch.index).trim();
                  
                  let rawName = portName;
                  if (/^g[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^g[a-z]*\s*(\d+.*)/i, 'Gi$1');
                  else if (/^f[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^f[a-z]*\s*(\d+.*)/i, 'Fa$1');
                  else if (/^t[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^t[a-z]*\s*(\d+.*)/i, 'Te$1');

                  parsedPorts.push({
                    port_name: rawName,
                    description: namePart,
                    status: status === 'disabled' ? 'disabled' : 'enabled',
                    vlan: vlan === 'trunk' || vlan === 'routed' ? '' : vlan
                  });
                }
              }
            });
            
            if (parsedPorts.length > 0 && selectedSwitch) {
              fetch(`/api/switches/${selectedSwitch}/ports/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ports: parsedPorts })
              })
              .then(() => fetchDbPorts(selectedSwitch))
              .catch(e => console.error("Bulk sync error", e));
            }
          }
        } else {
          setLogs((prev) => [...prev, `[Error] ${data.error}`]);
        }
      } catch (err) {
        setLogs((prev) => [...prev, `[Error] Failed to send command.`]);
      }
    }
  };

  const fetchCommandOutput = async (cmd, targetIp = ipAddress) => {
    try {
      const res = await fetch("/api/ssh/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: targetIp, command: cmd })
      });
      const data = await res.json();
      if (res.ok) {
        return data.output;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleCommandSubmit = async (e) => {
    if (e.key === "Enter" && command.trim()) {
      await executeCommand(command.trim());
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (!command) return;
      
      try {
        const res = await fetch("/api/ssh/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip_address: ipAddress, command: command })
        });
        const data = await res.json();
        if (res.ok && data.completed) {
          setCommand(data.completed);
        }
      } catch (err) {
        console.error("Autocomplete error", err);
      }
    }
  };

  useEffect(() => {
    const handleRunCmd = (e) => {
      if (window.activePane === title) {
        const payload = e.detail;
        if (typeof payload === 'object' && payload.action) {
          if (payload.action === 'export') {
            handleExportCsv();
            return;
          }
          const { logs: currentLogs, selectedPortIndex: currentIndex } = stateRef.current;
          if (currentIndex !== null && currentLogs[currentIndex]) {
            const portMatch = currentLogs[currentIndex].match(/^([A-Za-z]+\d+(?:\/\d+)*)\s/);
            if (portMatch) {
              const portName = portMatch[1];
              if (payload.action === 'shutdown') {
                executeCommand(`conf t\ninterface ${portName}\nshutdown\nend`);
              } else if (payload.action === 'no shutdown') {
                executeCommand(`conf t\ninterface ${portName}\nno shutdown\nend`);
              } else if (payload.action === 'default') {
                executeCommand(`conf t\ndefault interface ${portName}\nend`);
              }
            }
          }
        } else {
          executeCommand(payload);
        }
      }
    };
    window.addEventListener('run-command', handleRunCmd);
    return () => window.removeEventListener('run-command', handleRunCmd);
  }, [ipAddress, title, selectedSwitch]);

  const handleExportCsv = async () => {
    if (!selectedSwitch) {
      alert("Please select a switch first to export ports.");
      return;
    }
    try {
      const res = await fetch(`/api/switches/${selectedSwitch}/ports`);
      if (res.ok) {
        const ports = await res.json();
        if (ports.length === 0) {
          alert("No ports found in database for this switch. Please configure some ports first.");
          return;
        }
        
        const headers = ['Port Name', 'Description', 'Status', 'VLAN', 'Port Security', 'MAC Address', 'Last Updated'];
        const csvRows = [headers.join(',')];
        
        ports.forEach(port => {
          const values = [
            port.port_name || '',
            port.description ? `"${port.description.replace(/"/g, '""')}"` : '',
            port.status || '',
            port.vlan || '',
            port.port_security || '0',
            port.mac_address || '',
            port.last_updated || ''
          ];
          csvRows.push(values.join(','));
        });
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `switch_${selectedSwitch}_ports.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error("Failed to export CSV", e);
    }
  };

  const handleFocus = () => {
    window.activePane = title;
  };

  const openContextMenuInCenter = async (portName, logLine) => {
    let name = "";
    let status = "";
    let vlan = "";

    if (logLine) {
      const statusMatch = logLine.match(/(connected|notconnect|disabled|err-disable)/);
      if (statusMatch) {
        status = statusMatch[1];
        const statusIndex = statusMatch.index;
        const afterStatus = logLine.substring(statusIndex + status.length).trim().split(/\s+/);
        vlan = afterStatus[0] || "";
        const namePart = logLine.substring(portName.length, statusIndex).trim();
        name = namePart;
      }
    }

    setMenuPos({ x: null, y: null });
    setContextMenu({
      visible: true,
      port: portName,
      name,
      status,
      vlan,
      mac: 'Loading...',
      portSecurity: '0'
    });

    if (selectedSwitch) {
      try {
        fetch(`/api/switches/${selectedSwitch}/ports`)
          .then(res => res.ok ? res.json() : [])
          .then(portsData => {
            if (Array.isArray(portsData)) {
              const dbPort = portsData.find(p => p.port_name === portName);
              if (dbPort) {
                setContextMenu(prev => ({
                  ...prev,
                  portSecurity: dbPort.port_security || '0',
                  name: prev.name || dbPort.description || '',
                  vlan: prev.vlan || dbPort.vlan || ''
                }));
              }
            }
          })
          .catch(err => console.error("Error fetching db port:", err));
      } catch(e) {}
    }

    const macOutput = await fetchCommandOutput(`sh mac address-table int ${portName}`);
    if (macOutput) {
       const macMatch = macOutput.match(/([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})/);
       if (macMatch) {
          setContextMenu(prev => ({ ...prev, mac: macMatch[1] }));
       } else {
          setContextMenu(prev => ({ ...prev, mac: '-' }));
       }
    } else {
       setContextMenu(prev => ({ ...prev, mac: 'Error' }));
    }
  };

  const handleSaveContextMenu = async () => {
    let cmdSequence = `conf t\ninterface ${contextMenu.port}\n`;
    
    if (contextMenu.name) {
      cmdSequence += `description ${contextMenu.name}\n`;
    } else {
      cmdSequence += `no description\n`;
    }

    if (contextMenu.vlan) {
      cmdSequence += `switchport mode access\nswitchport access vlan ${contextMenu.vlan}\n`;
    }

    if (contextMenu.portSecurity && contextMenu.portSecurity !== "0") {
      cmdSequence += `switchport port-security\nswitchport port-security maximum ${contextMenu.portSecurity}\n`;
    } else if (contextMenu.portSecurity === "0") {
      cmdSequence += `no switchport port-security\n`;
    }

    if (contextMenu.status === 'disabled') {
      cmdSequence += `shutdown\n`;
    } else {
      cmdSequence += `no shutdown\n`;
    }

    cmdSequence += `end`;

    executeCommand(cmdSequence);

    if (selectedSwitch) {
      try {
        await fetch(`/api/switches/${selectedSwitch}/ports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            port_name: contextMenu.port,
            description: contextMenu.name || "",
            status: contextMenu.status || "",
            vlan: contextMenu.vlan || "",
            port_security: contextMenu.portSecurity || "0",
            mac_address: contextMenu.mac !== 'Loading...' && contextMenu.mac !== 'Error' ? contextMenu.mac : ""
          })
        });

        // Update local state directly
        setDbPorts(prev => ({
          ...prev,
          [contextMenu.port]: {
            ...prev[contextMenu.port],
            port_name: contextMenu.port,
            description: contextMenu.name || "",
            status: contextMenu.status || "",
            vlan: contextMenu.vlan || "",
            port_security: contextMenu.portSecurity || "0",
            mac_address: contextMenu.mac !== 'Loading...' && contextMenu.mac !== 'Error' ? contextMenu.mac : ""
          }
        }));

        // Update the description in logs state as well
        setLogs(prev => prev.map(line => {
          const portMatch = line.match(/^([A-Za-z]+\d+(?:\/\d+)*)\s/);
          if (portMatch) {
            const portName = portMatch[1];
            let rawName = portName;
            if (/^g[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^g[a-z]*\s*(\d+.*)/i, 'Gi$1');
            else if (/^f[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^f[a-z]*\s*(\d+.*)/i, 'Fa$1');
            else if (/^t[a-z]*\s*(\d+.*)/i.test(rawName)) rawName = rawName.replace(/^t[a-z]*\s*(\d+.*)/i, 'Te$1');

            if (rawName === contextMenu.port) {
              const statusMatch = line.match(/(connected|notconnect|disabled|err-disable)/);
              if (statusMatch) {
                const status = statusMatch[1];
                const afterStatus = line.substring(statusMatch.index + status.length).trim().split(/\s+/);
                const vlan = contextMenu.vlan || afterStatus[0] || "";
                let description = contextMenu.name || "";
                if (description.length > 50) {
                  description = description.substring(0, 50);
                }
                const duplex = afterStatus[1] || "";
                const speed = afterStatus[2] || "";
                return `${pad(portName, 9)}${pad(description, 51)}${pad(contextMenu.status === 'disabled' ? 'disabled' : status, 13)}${pad(vlan, 11)}${pad(duplex, 8)}${speed}`;
              }
            }
          }
          return line;
        }));
      } catch (e) {
        console.error("Failed to save port settings to DB", e);
      }
    }

    setContextMenu(prev => ({ ...prev, visible: false }));
    setMenuPos({ x: null, y: null });
    setVlanEditorOpen(false);
  };

  const handleDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    
    const rect = contextMenuRef.current.getBoundingClientRect();
    const parentRect = contextMenuRef.current.parentElement.getBoundingClientRect();
    
    const currentLeft = rect.left - parentRect.left + rect.width / 2;
    const currentTop = rect.top - parentRect.top + rect.height / 2;
    
    const initialX = menuPos.x !== null ? menuPos.x : currentLeft;
    const initialY = menuPos.y !== null ? menuPos.y : currentTop;
    
    if (menuPos.x === null) {
       setMenuPos({ x: currentLeft, y: currentTop });
    }
    
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setMenuPos({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  return (
    <div className="pane" onFocusCapture={handleFocus} style={{ position: 'relative' }}>
      <div className="pane-header">
        <div className="address-bar">
          <select 
            className="switch-select" 
            value={selectedSwitch} 
            onChange={handleSelectChange}
            title="Saved Switches"
          >
            <option value="">-- Select Saved Switch --</option>
            {switches.map((sw) => (
              <option key={sw.id} value={sw.id}>
                {sw.name} ({sw.ip_address})
              </option>
            ))}
          </select>
          <button className="btn-action btn-edit" onClick={() => setIsModalOpen(true)}>
            Edit
          </button>
        </div>
        <div className="address-bar">
          <input
            type="text"
            className="address-input"
            placeholder="IP Address (e.g., 192.168.1.1)"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
          />
          <button className="btn-action btn-connect" onClick={handleConnect}>
            Connect
          </button>
        </div>
      </div>
      <div className="pane-content" ref={contentRef}>
        {logs.map((log, index) => {
          const portMatch = log.match(/^([A-Za-z]+\d+(?:\/\d+)*)\s/);
          const isPort = !!portMatch;
          const portName = isPort ? portMatch[1] : null;
          const isSelected = selectedPortIndex === index;

          return (
            <div 
              key={index} 
              className={`terminal-line ${isPort ? 'interactive-port' : ''}`} 
              style={{ 
                color: isSelected ? '#38bdf8' : (log.startsWith('>') ? '#f1f5f9' : (log.startsWith('[System]') ? 'var(--accent)' : '#94a3b8')),
                cursor: isPort ? 'pointer' : 'default',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '2px 4px',
                borderRadius: '4px',
                margin: '1px 0'
              }}
              onClick={(e) => {
                if (isPort) {
                  setSelectedPortIndex(index);
                }
              }}
              onDoubleClick={(e) => {
                if (isPort) {
                  e.stopPropagation();
                  openContextMenuInCenter(portName, log);
                }
              }}
            >
              <span style={{ whiteSpace: 'pre-wrap' }}>{log}</span>
              {isSelected && (
                <span 
                  title="Edit Port"
                  style={{ cursor: 'pointer', color: '#f1f5f9', display: 'flex', padding: '0 4px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openContextMenuInCenter(portName, log);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </span>
              )}
            </div>
          );
        })}
        <div className="terminal-input-row">
          <span className="terminal-prompt">{isConnected ? "Switch#" : ">"}</span>
          <input 
            ref={inputRef}
            type="text" 
            className="terminal-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommandSubmit}
            disabled={!isConnected}
            placeholder={isConnected ? "" : "Connect first..."}
            spellCheck="false"
          />
        </div>
      </div>
      <EditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        switches={switches} 
        onRefresh={fetchSwitches} 
      />
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnect={handleConnectSubmit}
        ipAddress={ipAddress}
        prefilledUsername={switches.find((s) => s.ip_address === ipAddress)?.username}
      />
      {contextMenu.visible && (
        <div 
          ref={contextMenuRef}
          className="context-menu" 
          style={{ 
            position: 'absolute', 
            top: menuPos.y !== null ? `${menuPos.y}px` : '50%', 
            left: menuPos.x !== null ? `${menuPos.x}px` : '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#1e293b', 
            border: '2px solid #475569', 
            borderRadius: '8px', 
            width: '400px',
            minHeight: '300px',
            zIndex: 1000,
            boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top section */}
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #475569', padding: '12px 16px', minHeight: '56px', cursor: 'grab' }}
            onMouseDown={handleDragStart}
          >
            <div className="context-menu-title" style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              Port {contextMenu.port}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                title="Confirm"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#22c55e', display: 'flex', alignItems: 'center', padding: '4px' }}
                onClick={(e) => { e.stopPropagation(); handleSaveContextMenu(); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
              <button 
                title="Close"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: '4px' }}
                onClick={(e) => { e.stopPropagation(); setContextMenu(prev => ({ ...prev, visible: false })); setMenuPos({ x: null, y: null }); setVlanEditorOpen(false); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          
          {/* Middle section */}
          <div className="context-menu-body" style={{ color: '#f1f5f9', fontSize: '1.4rem', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', width: '120px' }}>Name</span>
              <input 
                type="text" 
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 8px', color: '#f1f5f9' }} 
                placeholder="Description" 
                value={contextMenu.name || ''}
                onChange={(e) => setContextMenu(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', width: '120px' }}>Status</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  onClick={() => setContextMenu(prev => ({ ...prev, status: prev.status === 'disabled' ? 'enabled' : 'disabled' }))}
                  style={{
                    width: '44px', height: '24px', backgroundColor: contextMenu.status !== 'disabled' ? '#22c55e' : '#ef4444',
                    borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%',
                    position: 'absolute', top: '3px', left: contextMenu.status !== 'disabled' ? '23px' : '3px',
                    transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ color: contextMenu.status !== 'disabled' ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                  {contextMenu.status !== 'disabled' ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', width: '120px' }}>Vlan</span>
              <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select 
                  style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 8px', color: '#f1f5f9' }}
                  value={contextMenu.vlan || ''}
                  onChange={(e) => setContextMenu(prev => ({ ...prev, vlan: e.target.value }))}
                >
                  <option value="">-- Select --</option>
                  {vlans.map(v => (
                    <option key={v.vlan_id} value={String(v.vlan_id)}>
                      {v.vlan_id}{v.name ? ` – ${v.name}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  title="Spravovať VLANy"
                  onClick={(e) => { e.stopPropagation(); setVlanEditorOpen(prev => !prev); }}
                  style={{ background: vlanEditorOpen ? 'rgba(56,189,248,0.15)' : 'transparent', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer', color: '#38bdf8', display: 'flex', alignItems: 'center', padding: '5px 6px', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
            </div>
            {vlanEditorOpen && (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#38bdf8', marginBottom: '4px' }}>Správa zoznamu VLAN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                  {vlans.length === 0 && <span style={{ color: '#64748b', fontSize: '1.1rem' }}>Žiadne VLANy.</span>}
                  {vlans.map(v => (
                    <div key={v.vlan_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', backgroundColor: '#1e293b' }}>
                      <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '1.2rem' }}>
                        <strong>{v.vlan_id}</strong>{v.name ? <span style={{ color: '#94a3b8' }}> – {v.name}</span> : ''}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteVlan(v.vlan_id); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: '2px 4px' }}
                        title="Odstrániť VLAN"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path><path d="M14 11v6"></path>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                  <input
                    type="number"
                    min="1" max="4094"
                    placeholder="ID (1–4094)"
                    value={newVlanId}
                    onChange={(e) => setNewVlanId(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '5px 7px', color: '#f1f5f9', fontSize: '1.2rem' }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddVlan(); }}
                    style={{ background: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', padding: '5px 10px', fontSize: '1.2rem', fontWeight: '600', flexShrink: 0 }}
                  >
                    + Pridať
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', width: '120px' }}>Port Security</span>
              <select 
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 8px', color: '#f1f5f9' }}
                value={contextMenu.portSecurity || '0'}
                onChange={(e) => setContextMenu(prev => ({ ...prev, portSecurity: e.target.value }))}
              >
                <option value="0">Disabled</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', width: '120px' }}>MAC Address</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{contextMenu.mac || '-'}</span>
                {contextMenu.port && (
                  <button 
                    title="Reset MAC address"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#38bdf8', display: 'flex', alignItems: 'center', padding: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const cmds = `conf t\ninterface ${contextMenu.port}\nno switchport port-security mac-address sticky\nswitchport port-security mac-address sticky\nshutdown\nno shutdown\nend`;
                      executeCommand(cmds);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      setMenuPos({ x: null, y: null });
                      setVlanEditorOpen(false);
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <g transform="translate(12, 12) scale(1.15) translate(-12, -12)">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                        <path d="M16 16h5v5"></path>
                      </g>
                      <text x="12" y="14.5" fontSize="6.5" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" letterSpacing="0.5">MAC</text>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div style={{ borderTop: '1px solid #475569', padding: '12px 16px', minHeight: '56px' }}>
            {/* Empty for now */}
          </div>
        </div>
      )}
    </div>
  );
}
