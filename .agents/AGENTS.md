Infromácie o projekte:



Moje meno je Martin

server má IP adresu 10.0.101.200



Workflow:



Ak sa v projekte zapisuje verzia uprav ju vždy pri zmene v kóde.
Ak nie je definované inak tak ako aktuálny den.mesiac.rok.hodina.minuta

GitHub:
- Neuploaduj (nepushuj) zmeny na GitHub automaticky, ale iba na výslovné vyžiadanie používateľa.


Deployment:
- Ubuntu Server IP: 10.0.101.200
- Prihlasovacie údaje: antigravity / Superheslo21
- Cesta k projektu na serveri: /home/spravca/cisco GUI
- Po zmene kódu a verzie uploadni zmenené súbory (Pane.js, SettingsModal.js, version.json) a reštartuj docker-compose:
  sudo docker-compose down && sudo docker-compose up --build -d


Plány na nabudúce:
- Upraviť funkcie preset tlačidiel (Počítač, Tlačiareň, Telefón, Telefón + Tlačiareň) v spodnej časti kontextového menu portu (momentálne slúžia ako šablóny na dopĺňanie skratiek do popisu).


