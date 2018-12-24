# Frisky Girl Farm API

API server for Frisky Girl Farm CSA website

## Deployment Setup

To set this up to deploy and run, perform the following steps:

1. Create a [Google Cloud project](https://cloud.google.com/resource-manager/docs/creating-managing-projects) with access to Google Sheets
2. Create a [service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) within the project with an editor or owner role
3. Create a [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) for the service account.
4. Extract the `private_key` and `client_email` fields from the downloaded service account key file and put them in a `config.<stage>.json` file (see [Build credentials](#build-credentials) section).
5. Using any user account, create a new Google Sheets spreadsheet
6. Invite the service account to the spreadsheet as an editor, as you would invite any user, but using the `client_email` from step 4.
7. Copy the ID of the spreadsheet from its URL (`https://docs.google.com/spreadsheets/d/<id>/edit`) it put it in the `config.<stage>.json` file (see [Build credentials](#build-credentials) section).
8. Set up the spreadsheet's `Mutex` sheet (see [Spreadsheet format](#spreadsheet-format) section).

## Spreadsheet format

The API server looks for two sheets in the spreadsheet, identified by name.

There must be a sheet named `Mutex` laid out like this:

|   | A    | B         |
|---|------|-----------|
| 1 | Name | Timestamp |

This sheet must always be present, and is used internally to ensure concurrent
writes to the sheet don't corrupt the data.

The other sheet the API server looks for is the one named `Orders`. When this
sheet is present, it will be used to track orders for a currently open order
period. When not present, orders are not tracked/allowed. The `Orders` sheet
must contain three rows. The sheet is laid out like this:

|   | A         | B              | C              | D              |
|---|-----------|----------------|----------------|----------------|
| 1 |           | (product name) | (product name) | (product name) |
| 2 | image     | (image URL)    | (image URL)    | (image URL)    |
| 3 | price     | (price)        | (price)        | (price)        |
| 4 | total     | (total)        | (total)        | (total)        |
| 5 | ordered   | =sum(B6:B)     | =sum(C6:C)     | =sum(D6:D)     |
| 6 | (user id) | (ordered)      | (ordered)      | (ordered)      |
| 7 | (user id) | (ordered)      | (ordered)      | (ordered)      |
| 8 | (user id) | (ordered)      | (ordered)      | (ordered)      |

* `product name` (string) the product's name
* `image URL` (string) the URL of an image of the product
* `price` (currency) the product's price
* `total` (number) the total quantity of the product that is available (0 to disable the product)
* `user id` (string) the id of a user
* `ordered` (number) a user's quantity of a product ordered

The user order rows (`7` - `9` and beyond) are filled in dynamically by the API
server.

There can be any number of additional sheets with any name, so the sheet for an
order period can be prepared under a different name, and then renamed to
`Orders` to open up ordering for that period. Then when the period is closed,
the sheet can be renamed to anything to close ordering.

## Build credentials

### AWS

Deploying master builds from TravisCI requires AWS credentials with permissions
to deploy a Serverless AWS Node.js project. `ci/aws-credentials.enc` is an
encrypted AWS credentials file. The `friskygirl` user in the file must have the
necessary permissions to deploy a Serverless AWS Node.js project.

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

When TravisCI deploys a successful master build it deploys it to the `stage`
stage, so `ci/config.stage.json.enc` is an encryped JSON file containing our
stage info.