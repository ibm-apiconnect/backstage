# API Connect Backstage Plugin

## Installing and using the API Connect Backstage Plugin

Getting the API Connect plugin - clone this repository.

### Pre-requisites

* A working, scaffolded Backstage app, installed and configured - see <https://backstage.io/docs/getting-started/>
* A working PostgresSQL database hooked up to your Backstage install for pesistent data.

### Installing the plugin

1. Unpack zip archive in plugins directory

2. From backstage app base path

  ```bash
  yarn --cwd packages/backend add @internal/apic-backstage@^1.0.0
  ```
### Installing the plugin on Redhat Developer Hub

1. Follow the usual dynamic plugin instructions to install `https://www.npmjs.com/package/apic-backstage` from npmjs.

### Configuration the API Connect Plugin

1. For each APIC instance/cloud you wish to configure you need to add name, url, clientId, clientSecret, username, password for a provider organisation in a section at the end of app-config.yaml

 ```yaml
 ibm:
  schedule: '*/10 * * * *'
  apic:
     - name: apic-instance-1
       url: https://api.<instance1>.com/api
       clientId: '<instance1-clientID>'
       clientSecret: '<instance1-clientSecret>'
       username: '<instance1-porg-user>'
       password: '<instance1-porg-pwd>'
       identityProvider: 'default-idp-2' # Default Local User Registry
     - name: apic-instance-2
       url: https://api.<instance2>.com/api
       clientId: '<instance2-clientID>'
       clientSecret: '<instance2-clientSecret>'
       apiKey: my-api-key
 ```

The values for the url, clientId and clientSecret can be found by downloading the toolkit credentials (<https://www.ibm.com/docs/en/api-connect/10.0.x?topic=configuration-installing-toolkit#task_qsv_cgq_nt__download_creds>)

The url is the value for the "endpoint" for the "toolkit",  with the corresponding values for "client_id" mapping to "clientId", and "client_secret" mapping to "clientSecret".

For example the credentials.json for apic-instance-1 in the example above could be:

```json
{
  "cloud_id": "<instance1-cloudID>",
  "toolkit": {
    "endpoint": "https://api.<instance1>com/api",
    "client_id": "<instance1-clientID>",
    "client_secret": "<instance1-clientSecret>"
  },
  "consumer_toolkit": {
    ...
  },
  ...
}
```

**Note**: the credentials.json uses snake case, the app-config.yaml API Connect configuration uses camel case.

The username and password or api key are for a provider organization member. It is assumed that there is a single user who is a member of each provider organization to be added to the backstage instance - they should have viewer role for each provider organization at least.  This user can also be a member of more than one provider organization.

### Using a Local User Registry

If the user is located in a Local User Registry you will need to provide the identity provider along side the username and password.

Identity Provider can be obtained from running this APIC CLI command:
```bash
apic identity-providers:list --scope provider --server myserver.com --fields title,realm
```

### Using an OIDC Registry

When using a user located in a OIDC registry you only need to provide an apiKey. You will need to edit the apiKey lifetime and enable multiple. Instructions on this can be found here https://www.ibm.com/docs/en/api-connect/10.0.8?topic=settings-configuring-api-key

Once you have done this you create an API Key by following the instructions at https://www.ibm.com/docs/en/api-connect/10.0.8?topic=applications-managing-platform-rest-api-keys

Now that you have your add API Key you would just need to add it to your config as shown in the example for `apic-instance-2`

2. For your Backstage app, edit packages/backend/src/index.ts.  Add the following to the end of the file.

  ```javascript
  backend.add(import('@internal/apic-backstage'));
  ```

3. Start backstage app

```bash
yarn dev
```

## Support

Support is available for customers with a valid IBM API Connect entitlement - simply raise an IBM support case as normal. Note that this will only provide support for the APIC plugin itself, not the backstage (or Redhat DevHub) server instance.

### References

<https://backstage.io/docs/>

<https://www.ibm.com/docs/en/api-connect/10.0.x>

### Known Limitations

* only tested with local user registry and oidc.
* do not use capitals or punctuation other than `-` for the name in the apic config.
