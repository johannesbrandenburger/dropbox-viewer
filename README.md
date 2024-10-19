# Dropbox Viewer

This is a simple web application that allows you to view images from a Dropbox folder. It uses the Dropbox API to fetch the images and displays them in a scrollable gallery.


## Setup

To run this application, you need to create a Dropbox app and get an access token. You can follow the instructions [here](https://developers.dropbox.com/oauth-guide) to create an app and get an access token.

Once you have the access token, create a `.env` file in the root directory of the project and add the following environment variables:

```env
NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN="<your-dropbox-access-token>"
NEXT_PUBLIC_DROPBOX_FOLDER_PATH="/Camera uploads" # or any other folder path
NEXT_PUBLIC_APP_NAME="Pictures from my travels" # or any other name
```

Then, run the following commands:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.