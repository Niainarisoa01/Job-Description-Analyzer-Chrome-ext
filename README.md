# Job Description Analyzer Chrome Extension

A Chrome extension that uses AI to analyze job descriptions, extract key skills, and provide insights to job seekers.

## Features

- **Job Description Analysis**: Extract and analyze job descriptions from any webpage
- **Skill Identification**: Automatically identify technical skills, soft skills, and qualifications
- **Floating Panel UI**: View analysis results in a draggable, collapsible panel
- **Keyword Highlighting**: Highlight important keywords directly in the job posting
- **User Authentication**: Sign up and log in to save your analysis history
- **Premium Features**: Access advanced insights with a premium subscription

## Technologies Used

- **TypeScript**: For type-safe code
- **Chrome Extension API**: For browser integration
- **Google Gemini AI**: For natural language processing and job analysis
- **Supabase**: For user authentication and data storage
- **Stripe**: For payment processing
- **Bootstrap**: For UI components

## Installation for Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/job-description-analyzer.git
   cd job-description-analyzer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Configuration

Before using the extension, you need to set up the following:

1. **Gemini API Key**: Get an API key from [Google AI Studio](https://ai.google.dev/)
2. **Supabase Project**: Create a project on [Supabase](https://supabase.com/) and get your URL and anon key
3. **Stripe Account**: Set up a [Stripe](https://stripe.com/) account for payment processing

Add these keys to the extension's options page after installation.

## Development

- Run the development build with file watching:
  ```
  npm run watch
  ```

- The extension uses a modular architecture:
  - `background/`: Background service worker
  - `content/`: Content scripts for webpage interaction
  - `popup/`: Extension popup UI
  - `api/`: API service integrations
  - `utils/`: Utility functions and types
  - `components/`: Reusable UI components

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details. 