# Frisky Girl Farm API

API server for Frisky Girl Farm CSA website

## Overview

This project implements the API server, which is an Express app that uses a
Google Sheets spreadsheet as its backend storage. It's set up to run in AWS
Lambda and to deploy via Serverless, but should be runnable in any deplyment
environment that supports Node.js.

## Deployment Setup

To set this up to deploy and run, perform the following steps:

1. Create a [Google Cloud project](https://cloud.google.com/resource-manager/docs/creating-managing-projects) with access to Google Sheets
2. Create a [service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) within the project with an editor or owner role
3. Create a [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) for the service account.
4. Extract the `private_key` and `client_email` fields from the downloaded service account key file and put them in a `config.<stage>.json` file (see [Build credentials](#build-credentials) section).
5. [Enable](https://console.developers.google.com/flows/enableapi?apiid=sheets.googleapis.com) the Google Sheets API for your project.
6. Using any user account, create a new Google Sheets spreadsheet
7. Invite the service account to the spreadsheet as an editor, as you would invite any user, but using the `client_email` from step 4.
8. Copy the ID of the spreadsheet from its URL (`https://docs.google.com/spreadsheets/d/<id>/edit`) it put it in the `config.<stage>.json` file (see [Build credentials](#build-credentials) section).

## Spreadsheet format

The API server looks for several sheets in the spreadsheet, identified by name.
Any other sheets will be ignored. A minimal template spreadsheet can be found
[here](https://docs.google.com/spreadsheets/d/1gdw6m-eWT3OZ2dzEztGnws8m76nI2yKwSddvowNlQCs/edit#gid=1406465942).

### Users

There must be a sheet named `Users` laid out like this:

|   | A       | B      | C          | D       | E                  | F
| 1 | email   | name   | location   | balance | starting balance   | spent
| 2 | (email) | (name) | (location) | =F2-G2  | (starting balance) | (spent)
| 3 | (email) | (name) | (location) | =F3-G3  | (starting balance) | (spent)
| 4 | (email) | (name) | (location) | =F4-G4  | (starting balance) | (spent)

* `email` (string) The user's email
* `name` (string) The user's name
* `location` (string) The location where the user is picking up their order
* `starting balance` (currency) The user's starting balance for the season
* `spent` (currency) The amount the user has already spent, not including the current order (if any)

Rows `2` - `4` (and beyond) are filled in dynamically by the API.

### Orders

The API server looks for a sheet named `Orders`. When this sheet is present, it
will be used to track orders for a currently open order period. When not
present, orders are not tracked/allowed. The `Orders` sheet is laid out like
this:

|   | A         | B              | C              | D              |
|---|-----------|----------------|----------------|----------------|
| 1 |           | (product name) | (product name) | (product name) |
| 2 | price     | (price)        | (price)        | (price)        |
| 3 | image     | (image URL)    | (image URL)    | (image URL)    |
| 4 | total     | (total)        | (total)        | (total)        |
| 5 | ordered   | =sum(B6:B)     | =sum(C6:C)     | =sum(D6:D)     |
| 6 | (user id) | (ordered)      | (ordered)      | (ordered)      |
| 7 | (user id) | (ordered)      | (ordered)      | (ordered)      |
| 8 | (user id) | (ordered)      | (ordered)      | (ordered)      |

* `product name` (string) the product's name
* `price` (currency) the product's price
* `image URL` (string) the URL of an image of the product
* `total` (number) the total quantity of the product that is available (0 to disable the product or -1 to not have a limit)
* `user id` (string) the id of a user
* `ordered` (number) a user's quantity of a product ordered

The user order rows (`7` - `9` and beyond) are filled in dynamically by the API
server.

Since sheets with names not specified here are ignored, the sheet for an order
period can be prepared under a different name, and then renamed to `Orders` to
open up ordering for that period. Then when the period is closed, the sheet can
be renamed to anything to close ordering.

## Build credentials

### AWS

Deploying master builds from GitHub actionds requires AWS credentials with
permissions to deploy a Serverless AWS Node.js project. The `AWS_CREDENTIALS`
GitHub repository secret contains an `~/.aws/credentials` file with credentials
for a `friskygirl` user that must have the necessary permissions to deploy a
Serverless AWS Node.js project.

When deploying manually, you just need to assume role with the proper
permissions per standard Serverless requirements.

### Google Sheets

This project uses a Google Sheets spreadsheet as its backend storage, so it
needs the id of the spreadsheet to use and the email and private key of a
Google API user with write access to the spreadsheet. Each stage (e.g. `stage`,
`prod`) can have its own user and spreadsheet, so this info is configured in
`config.<stage>.json`. This is a JSON file with the following format:

```json
{
  "privateKey": "<Google API user's private key>",
  "email": "<Google API user's email>",
  "spreadsheetId": "<id of Google Sheets spreadsheet>"
}
```

When GitHub actions deploys a successful master build it deploys it to the
`prod` stage, so the `GOOGLE_SHEETS_CONFIG` repository secret contains the
`prod` deployment info.
