# Dropbox Viewer

This is a simple web application that allows you to view images from a Dropbox folder. It uses the Dropbox API to fetch the images and displays them in a scrollable gallery.


## Setup

To run this application, you need to create a Dropbox app and get an refresh token. You can follow the instructions [here](https://developers.dropbox.com/oauth-guide) to create an app. Then, you can get the a refresh token by visiting the following URL in your browser:

```bash
https://www.dropbox.com/oauth2/authorize?client_id=<YOUR_APP_ID>&response_type=code
```

Replace `<YOUR_APP_ID>` with the app key you got when you created the app. After you authorize the app, you have to make a GET request to the following URL to get the refresh token:

```bash
https://api.dropbox.com/oauth2/token
{
    "code": "<CODE>",
    "grant_type": "authorization_code",
    "client_id": "<YOUR_APP_ID>",
    "client_secret": "<YOUR_APP_SECRET>"
}
```

Which should return a JSON object with the refresh token. The app will use this token to get a access token.

> ⚠️ **Note**: This application is not secure and should not be used in a production environment. It's only to share images from a Dropbox folder with friends and family. It exposes the access token in the client-side code, so that everybody has read access to the specified folder.

Once you have the refresh token, create a `.env` file in the root directory of the project and add the following environment variables:

```env
NEXT_PUBLIC_DROPBOX_FOLDER_PATH="/Camera uploads" # or any other folder path
NEXT_PUBLIC_APP_NAME="Pictures from my travels" # or any other name
NEXT_PUBLIC_DROPBOX_APP_SECRET="<YOUR_APP_SECRET>"
NEXT_PUBLIC_DROPBOX_APP_KEY="<YOUR_APP_KEY>"
NEXT_PUBLIC_DROPBOX_REFRESH_TOKEN="<YOUR_REFRESH_TOKEN>"
```

Then, run the following commands:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.