# KrishiChoice — Crop Recommendation (Frontend)

College project UI for recommending a crop from soil and weather values. It uses the local `Crop_recommendation.csv` file in the browser. There is no backend.

## Dataset

Copied from `C:\Users\surya\OneDrive\Desktop\Crop_recommendation.csv` into `public/Crop_recommendation.csv`.

- 2200 samples
- 22 crops (100 rows each)
- Features: N, P, K, temperature, humidity, ph, rainfall, label

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints, then try **Recommend**, crop cards, and the dataset table.

## How ranking works

The app builds a mean and spread for each crop from the CSV. Your seven inputs are scored against those profiles with a Gaussian similarity, then the top 5 crops are shown.
