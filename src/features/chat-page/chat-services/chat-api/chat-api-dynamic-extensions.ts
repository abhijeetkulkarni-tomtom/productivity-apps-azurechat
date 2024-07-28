"use server";
import "server-only";

import { ServerActionResponse } from "@/features/common/server-action-response";

import { userHashedId } from "@/features/auth-page/helpers";
import { getAccessToken } from "@/features/auth-page/helpers";
import {
  FindAllExtensionForCurrentUser,
  FindSecureHeaderValue,
} from "@/features/extensions-page/extension-services/extension-service";
import {
  ExtensionFunctionModel,
  ExtensionModel,
} from "@/features/extensions-page/extension-services/models";
import { RunnableToolFunction } from "openai/lib/RunnableFunction";
import { ToolsInterface } from "../models";
export const GetDynamicExtensions = async (props: {
  extensionIds: string[];
}): Promise<ServerActionResponse<Array<any>>> => {
  const extensionResponse = await FindAllExtensionForCurrentUser();

  if (extensionResponse.status === "OK") {
    const extensionToReturn = extensionResponse.response.filter((e) =>
      props.extensionIds.includes(e.id)
    );

    const dynamicExtensions: Array<RunnableToolFunction<any>> = [];

    extensionToReturn.forEach((e) => {
      e.functions.forEach((f) => {
        const extension = JSON.parse(f.code) as ToolsInterface;
        dynamicExtensions.push({
          type: "function",
          function: {
            function: (args: any) =>
              executeFunction({
                functionModel: f,
                extensionModel: e,
                args,
              }),
            parse: JSON.parse,
            parameters: extension.parameters,
            description: extension.description,
            name: extension.name,
          },
        });
      });
    });

    return {
      status: "OK",
      response: dynamicExtensions,
    };
  }

  return extensionResponse;
};

async function executeFunction(props: {
  functionModel: ExtensionFunctionModel;
  extensionModel: ExtensionModel;
  args: any;
}) {
  try {
    const { functionModel, args, extensionModel } = props;

    // get the secure headers
    const headerPromise = extensionModel.headers.map(async (h) => {
      const headerValue = await FindSecureHeaderValue(h.id);

      if (headerValue.status === "OK") {
        return {
          id: h.id,
          key: h.key,
          value: headerValue.response,
        };
      }

      return {
        id: h.id,
        key: h.key,
        value: "***",
      };
    });

    const headerItems = await Promise.all(headerPromise);

    // we need to add the user id to the headers as this is expected by the function and does not have context of the user
    
    if (extensionModel.name.toLowerCase().indexOf("servicenow") === -1 && extensionModel.name.toLowerCase().indexOf("bing") === -1) {
      headerItems.push({
        id: "authorization",
        key: "Authorization",
        value: "Bearer " + await getAccessToken() //userHashedId(),
      });
    }

    if (extensionModel.name.toLowerCase().indexOf("bing") > -1) {
      headerItems.push({
        id: "authorization",
        key: "authorization",
        value: await userHashedId(),
      });
    }
    
    // map the headers to a dictionary
    const headers: { [key: string]: string } = headerItems.reduce(
      (acc: { [key: string]: string }, header) => {
        acc[header.key] = header.value;
        return acc;
      },
      {}
    );
    console.log("Headers:", headers);

    console.log("Query:", args.query);
    // replace the query parameters
    if (args.query) {
      for (const key in args.query) {
        const value = args.query[key];
        functionModel.endpoint = functionModel.endpoint.replace(
          `${key}`,
          value
        );
      }
    }

    const requestInit: RequestInit = {
      method: functionModel.endpointType,
      headers: headers,
      cache: "no-store",
    };

    console.log("Body", JSON.stringify(args.body));
    if (args.body) {
      requestInit.body = JSON.stringify(args.body);
    }

    console.log("FunctionModel.Endpoint:", functionModel.endpoint);
    console.log("FunctionModel.EndpointType", functionModel.endpointType);

    const response = await fetch(functionModel.endpoint, requestInit);
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (!response.ok) {
      return `There was an error calling the api: ${response.statusText}`;
    }
    const result = await response.json();
    console.log("Response body:", result);

    return {
      id: functionModel.id,
      result: result,
    };
  } catch (e) {
    console.error("🔴", e);
    return `There was an error calling the api: ${e}`;
  }
}
