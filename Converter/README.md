# Topic Converter 🛠️

Tato složka obsahuje nástroje pro převod a zpracování maturitních témat.

## Obsah
1. `convert.js` - Převede soubory z `Files_docx` do Markdownu ve složce `Output_md`.
2. `parse_topics.py` - Rozdělí hotové Markdown soubory na menší části (podle nadpisů) pro snadnější zobrazení v aplikaci a vygeneruje `structure.json`.

## Jak používat

### 1. Instalace závislostí
```bash
npm install
```

### 2. Volba módu
Nástroj nyní nabízí dva hlavní způsoby použití:

#### A. Konzolový (Interaktivní) mód
Pokud spustíte nástroj bez parametrů, provede vás výběrem interaktivně:
```bash
node convert.js
```
Zde si můžete vybrat:
1.  **Spuštění webového serveru.**
2.  **Konverzi celé složky** (všechny soubory daného typu v zadané složce).

#### B. Webový mód
Můžete spustit přímo webové rozhraní:
```bash
node convert.js --server
```
Poté otevřete prohlížeč na adrese [http://localhost:3000](http://localhost:3000). V tomto módu můžete nahrávat jednotlivé soubory a okamžitě stahovat výsledek.

#### C. Parametrický mód (CLI)
Pro automatizaci můžete stále používat parametry:
```bash
node convert.js --from docx --to md --input ./MojeSlozka --output ./Vysledky
```

### 3. Rozdělení na části (pro aplikaci)
```bash
python parse_topics.py
```


