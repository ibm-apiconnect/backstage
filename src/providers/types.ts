/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
export type IbmApicConfig = {
  id: string;
  url: string;
  clientId: string,
  clientSecret: string,
  username: string | undefined,
  password: string | undefined,
  identityProvider: string | undefined,
  apiKey: string | undefined,
};