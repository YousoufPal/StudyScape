# StudyScape

StudyScape is a cross-platform mobile application designed to help students discover and rate study spots in Melbourne using a map interface. This project is built with React Native and utilizes Firebase for backend services.

## Features

- Discover study spots on a map centered around Melbourne.
- Rate and review study spots.
- User authentication with Firebase.
- Filter study spots based on various criteria.

## Project Structure

```
studyscape
├── src
│   ├── assets
│   │   ├── fonts
│   │   └── icons
│   ├── components
│   │   └── index.ts
│   ├── navigation
│   │   └── AppNavigator.tsx
│   ├── screens
│   │   ├── AuthScreen.tsx
│   │   ├── MapScreen.tsx
│   │   └── SpotDetailScreen.tsx
│   ├── services
│   │   ├── firebase.ts
│   │   ├── geocodeService.ts
│   │   └── spotService.ts
│   └── types
│       └── index.ts
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── README.md
└── .github
    └── workflows
        └── ci.yml
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- Expo CLI (if using Expo)
- Firebase account and project setup

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/studyscape.git
   cd studyscape
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Firebase configuration:
   - Copy `.env.example` to `.env` and fill in your Firebase credentials.

4. Run the application:
   ```
   npm start
   ```

### Folder Structure

- **src/assets**: Contains custom fonts and icons.
- **src/components**: Reusable UI components.
- **src/navigation**: Navigation setup for the app.
- **src/screens**: Different screens of the application.
- **src/services**: Services for Firebase and Geocoding API.
- **src/types**: TypeScript types and interfaces.

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

### License

This project is licensed under the MIT License. See the LICENSE file for details.