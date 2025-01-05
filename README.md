# Playwright API Contract Testing

This project uses Playwright as a testing framework based on the OpenAPI specification file.
It reads the spec file and it builds requests and expected response codes and schemas based on that.

### Run the tests using the following command:

npx playwright test

### VPN 

We need to be connected to educastream vpn

## Detailed explanation

The purpose of the contract tests is to assert that the endpoints are meeting the requirements defined in the 
contract, the OpenAPI spec file - the yaml file.

We have defined an .env file that holds the environemnt variables:
 - BASE_URL 
 - CF_BASE_URL 
 - CF_LOGIN_USER 
 - CF_LOGIN_PASS 
 - ENABLE_LOGGING 

The tests are in under **tests/contractTesting.spec.ts**

We read the yaml file and we define an ajv object for the schema validation. You can read more about this at https://www.npmjs.com/package/ajv

We also need a **sessionid** appended as a query param for all the endpoints. To do this we have created a login script inside the **auth.setup.ts** that will perform a POST login request on the Coldfusion base url. 
This session id will than be read a sa global varaible in a before all script that will run once befroe all the other tests

We are than creating a list of reqeust objects using by calling **buildRequestsFromSpec**. This function is defined inside ApiSPecRequestBuilder.ts under utils folder. Here we have all sort of helper methods that based on the yaml file provided are parsing it and are creating a list of Reqeust objects modeled under ReqeustModel.ts. These mehtods are reading the paths, operations (GET/POST etc) the paramters, values, response condes and response scehmas and are creating unique combination for these.

The tests are created dynamically by iterating the list of request objects. We use the request object to create the url and the request that we are triggeing. We trigger than the request and we are validating the response code and schema mathces the one returned as response from the server.

#### Request Model explanation

 - method :: GET/POST/PUT/DELETE
 - queryParamters :: the query paramters of the request
 - headers :: the headers of the request
 - body :: if the request is POST/PUT we are having a request body
 - expectedResponses :: here we store the expected response code and schema
 - requestBodyType :: in case we have a request body this can have different values and affects how the playwright request is triggered, eg: multipart/form-data, json etc

Based on the requestBodyType we are building the Playwright request differently in case of POST or PUT requests.

#### Logging mechanism

We are also having a Logging mechanism that helps us log the request object to help the debugging. We can set the ENABLE_LOGGING env variable to true if we want to log or to false if we don't.


#### Proxy mechanism

If we want to pass the requests through a proxy can configure this under playwirght.config.ts. If we enable this we need to have a local proxy started on that port othewise the rquests will not be tirggered.


### CI/CD integration

This needs to be developed