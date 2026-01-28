# Assign to Cursor

This is an extension for [Aha! Develop](https://www.aha.io/develop) providing integration with [Cursor cloud agents](https://cursor.com/docs/cloud-agent).
Assign Features and Requirements to [Cursor](https://cursor.com/) directly from Aha! Develop.


## Screen shots

<img width="776" alt="image" src="https://github.com/user-attachments/assets/b8cf383e-d01f-44c0-a707-903e89e14174" />

<img width="776" alt="image" src="https://github.com/user-attachments/assets/a4e98cbc-1db0-4db2-835f-f862609d6573" />


## Installing the extension

1. [Configure cloud agents within your Cursor account.](https://cursor.com/dashboard?tab=cloud-agents)   

3. Setup the extension **Account Settings -> Extensions -> Cursor** by specifying your Cursor **API key**, the **Repository URL** and **Base branch**.

4. Add the extension field to your Feature and Requirement screens.

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

Install the Cursor extension by clicking [here](https://secure.aha.io/settings/account/extensions/install?url=https%3A%2F%2Fsecure.aha.io%2Fextensions%2Faha-develop.assign-cursor.gz
).

## Working on the extension

Install [`aha-cli`](https://github.com/aha-app/aha-cli):

```sh
npm install -g aha-cli
```

Clone the repo:

```sh
git clone git@github.com:aha-develop/assign-cursor.git
```

**Note: In order to install an extension into your Aha! Develop account, you must be an account administrator.**

Install the extension into Aha! and set up a watcher:

```sh
aha extension:install
aha extension:watch
```

Now, any change you make inside your working copy will automatically take effect in your Aha! account.

## Building

When you have finished working on your extension, package it into a `.gz` file so that others can install it:

```sh
aha extension:build
```

After building, you can upload the `.gz` file to a publicly accessible URL, such as a GitHub release, so that others can install it using that URL.

To learn more about developing Aha! Develop extensions, including the API reference, the full documentation is located here: [Aha! Develop Extension API](https://www.aha.io/support/develop/extensions)
