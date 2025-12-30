# Ohanashi 🌸

An elegant, minimalist AI conversation interface powered by Google Gemini Live API.

## Features

*   **Real-time Voice:** Low-latency conversation using `gemini-2.5-flash-native-audio`.
*   **Advanced Acoustic Modeling:** Customize Pitch, Speed, Breathiness, and Emotion.
*   **Visualizer:** Real-time audio visualization.
*   **Preset Management:** Save and load different AI personas.

## Local Development

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```env
    API_KEY=your_google_api_key_here
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```

## Deployment on Vercel

1.  Push this repository to GitHub.
2.  Import the project in Vercel.
3.  **CRITICAL:** In the Vercel Project Settings, go to **Environment Variables** and add:
    *   Key: `API_KEY`
    *   Value: `[Your Google Gemini API Key]`
4.  Deploy.
