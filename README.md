# 📊 Customer Insights Dashboard

A powerful, entirely browser-based tool to analyze customer comments for Sentiment and Topics instantly. No backend or complex installations required!

## 🚀 Getting Started

1. Navigate to this folder and double-click on `index.html` to open it in your web browser (Chrome, Edge, Firefox, etc.).
2. You will see an **Upload Customer Data** drop zone.
3. Click **"Load Sample Data"** to try out the built-in demo, or simply drag and drop your own CSV flat file onto the screen.

## 📁 Supported Data Format
For the best results, your Customer Feedback CSV file should contain the following column headers (they are case-insensitive):
- `response ID`
- `EMAIL`
- `NPS SCORE`
- `NPS COMMENT` *(The application reads text from this column to generate Sentiment and Topic tags!)*

## ⚙️ Technical Overview
- **UI & Styling:** Clean, dynamic glassmorphism design created in `index.html` and `styles.css`.
- **CSV Parsing:** Uses PapaParse via CDN within `app.js` to process large tables quickly directly on your own machine.
- **NLP Analysis:** Calculates Sentiment (Positive, Negative, Neutral) and assigns Topics (Service, Price, Product/UI) automatically based on comment contents.
- **Data Visualization:** Uses Chart.js to generate instant analytical charts and color-coded table badges based on calculated feedback scores.

*All data runs locally on your machine—ensuring 100% data privacy!*
