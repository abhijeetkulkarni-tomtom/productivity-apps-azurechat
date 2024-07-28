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
        value: "Bearer eyJ0eXAiOiJKV1QiLCJub25jZSI6InNUZi02SUxZWFVYVHkzY09WSzgyeDFNcF9oU0JJYXQ3bEdvOFR3bUYyQlUiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1HTHFqOThWTkxvWGFGZnBKQ0JwZ0I0SmFLcyIsImtpZCI6Ik1HTHFqOThWTkxvWGFGZnBKQ0JwZ0I0SmFLcyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8zNzRmODAyNi03YjU0LTRhM2EtYjg3ZC0zMjhmYTI2ZWMxMGQvIiwiaWF0IjoxNzIyMTU3NzcxLCJuYmYiOjE3MjIxNTc3NzEsImV4cCI6MTcyMjE2MzI1NywiYWNjdCI6MCwiYWNyIjoiMSIsImFjcnMiOlsidXJuOnVzZXI6cmVnaXN0ZXJzZWN1cml0eWluZm8iXSwiYWlvIjoiQVlRQWUvOFhBQUFBZDYxSURHRHYvN3dzWW9WZkY3a3EwNXR1WXJZN0tKSDZpNy9DdG42R2t5VUdETUNlY3UvaHNPSDduZFEwaUdZRmpDb0tKUzFJbVBvTjdtQ1h5UWFBTGNvVkUrRnMvVWp3S25JOE8rSGN3OFBnVEd2R2s3TllCTmpYeGlhREM3ZjVVU3VJeXBYVThQbFI5dFZIdVdSMU01b3RsbGdGQUJsT1F0b0lBYXdVOXA4PSIsImFtciI6WyJyc2EiLCJtZmEiXSwiYXBwX2Rpc3BsYXluYW1lIjoiR3JhcGggRXhwbG9yZXIiLCJhcHBpZCI6ImRlOGJjOGI1LWQ5ZjktNDhiMS1hOGFkLWI3NDhkYTcyNTA2NCIsImFwcGlkYWNyIjoiMCIsImNhcG9saWRzX2xhdGViaW5kIjpbImNhNDk3YzQ2LTdhY2ItNDU1Ny1hOTIyLTU0OGFjMjhhY2JhNiJdLCJkZXZpY2VpZCI6ImVhMDkxOTVlLTg3M2YtNDllMi1hZmNjLTMxNTBiYWJkMWU4MyIsImZhbWlseV9uYW1lIjoiS3Vsa2FybmkiLCJnaXZlbl9uYW1lIjoiQWJoaWplZXQiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIyNDA5OjQwYzI6MTA1MTo4NWM0OjRjNzQ6Y2FmNTphYjI6MmIzYSIsIm5hbWUiOiJBYmhpamVldCBLdWxrYXJuaSIsIm9pZCI6IjQ4NzI5NzUwLWQzMmEtNDc5ZC04OTY0LTRjMDI3MWRlMzZhZiIsIm9ucHJlbV9zaWQiOiJTLTEtNS0yMS0yMDIzODczNDUtNDIwMTMyNDI0NS0zNzA5NjcyNzE0LTI3MzE2MiIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzM0ZGRkFBQjU3NjBDIiwicmgiOiIwLkFYb0FKb0JQTjFSN09rcTRmVEtQb203QkRRTUFBQUFBQUFBQXdBQUFBQUFBQUFCNkFDSS4iLCJzY3AiOiJBdWRpdExvZy5SZWFkLkFsbCBCb29raW5nc0FwcG9pbnRtZW50LlJlYWRXcml0ZS5BbGwgQ2FsZW5kYXJzLlJlYWQgQ2FsZW5kYXJzLlJlYWQuU2hhcmVkIENhbGVuZGFycy5SZWFkQmFzaWMgQ2FsZW5kYXJzLlJlYWRXcml0ZSBDb250YWN0cy5SZWFkV3JpdGUgRGV2aWNlTWFuYWdlbWVudEFwcHMuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudEFwcHMuUmVhZFdyaXRlLkFsbCBEZXZpY2VNYW5hZ2VtZW50Q29uZmlndXJhdGlvbi5SZWFkLkFsbCBEZXZpY2VNYW5hZ2VtZW50Q29uZmlndXJhdGlvbi5SZWFkV3JpdGUuQWxsIERldmljZU1hbmFnZW1lbnRNYW5hZ2VkRGV2aWNlcy5Qcml2aWxlZ2VkT3BlcmF0aW9ucy5BbGwgRGV2aWNlTWFuYWdlbWVudE1hbmFnZWREZXZpY2VzLlJlYWQuQWxsIERldmljZU1hbmFnZW1lbnRNYW5hZ2VkRGV2aWNlcy5SZWFkV3JpdGUuQWxsIERldmljZU1hbmFnZW1lbnRSQkFDLlJlYWQuQWxsIERldmljZU1hbmFnZW1lbnRSQkFDLlJlYWRXcml0ZS5BbGwgRGV2aWNlTWFuYWdlbWVudFNlcnZpY2VDb25maWcuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudFNlcnZpY2VDb25maWcuUmVhZFdyaXRlLkFsbCBEaXJlY3RvcnkuQWNjZXNzQXNVc2VyLkFsbCBEaXJlY3RvcnkuUmVhZFdyaXRlLkFsbCBGaWxlcy5SZWFkV3JpdGUuQWxsIEdyb3VwLlJlYWRXcml0ZS5BbGwgSWRlbnRpdHlSaXNrRXZlbnQuUmVhZC5BbGwgTWFpbC5SZWFkV3JpdGUgTWFpbC5TZW5kIE1haWxib3hTZXR0aW5ncy5SZWFkV3JpdGUgTm90ZXMuUmVhZFdyaXRlLkFsbCBvcGVuaWQgUGVvcGxlLlJlYWQgcHJvZmlsZSBSZXBvcnRzLlJlYWQuQWxsIFNpdGVzLlJlYWRXcml0ZS5BbGwgVGFza3MuUmVhZFdyaXRlIFVzZXIuUmVhZCBVc2VyLlJlYWRCYXNpYy5BbGwgVXNlci5SZWFkV3JpdGUgVXNlci5SZWFkV3JpdGUuQWxsIGVtYWlsIiwic2lnbmluX3N0YXRlIjpbImR2Y19tbmdkIiwiZHZjX2NtcCIsImttc2kiXSwic3ViIjoiZGFNZXY4TjBJeDVhd3RpYzE3b0ZVOFRVcUxtUUtQSWdvR2FENzNLa20yWSIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJFVSIsInRpZCI6IjM3NGY4MDI2LTdiNTQtNGEzYS1iODdkLTMyOGZhMjZlYzEwZCIsInVuaXF1ZV9uYW1lIjoiYWJoaWplZXQua3Vsa2FybmlAdG9tdG9tLmNvbSIsInVwbiI6ImFiaGlqZWV0Lmt1bGthcm5pQHRvbXRvbS5jb20iLCJ1dGkiOiJWdkVWXzNZMi1VNmpFN05qYktjTEFBIiwidmVyIjoiMS4wIiwid2lkcyI6WyJjZjFjMzhlNS0zNjIxLTQwMDQtYTdjYi04Nzk2MjRkY2VkN2MiLCJiNzlmYmY0ZC0zZWY5LTQ2ODktODE0My03NmIxOTRlODU1MDkiXSwieG1zX2NjIjpbIkNQMSJdLCJ4bXNfaWRyZWwiOiIxIDE0IiwieG1zX3NzbSI6IjEiLCJ4bXNfc3QiOnsic3ViIjoiUWVmMmxMUm82MnhaTTdsTnBVSTc2RXd0QXhiTEJSd0FPOEVRRlZVNXRQVSJ9LCJ4bXNfdGNkdCI6MTQyNDc2OTU4NSwieG1zX3RkYnIiOiJFVSJ9.WcOnm9dkAb5xUIiEjtYuV9eQY1TIlQs3Nug7UmHr9kHYnGVvDP9Sfa8O1ji2PgbBwcJq194aX1wjTquowbV1P86u6nL6xyLShr_QZMAtaeSU1lGQNawaVb0PnzhUI_J8iH_LS5dmS5wAVCXhWNLoHttO6Oesn7ZvJHX6aqiZd8rzF8s9sXJGEnNtaP96qB4qsdqwOdIZz1q3QuiinnXO5i1FUlyNKz--4wuBEJZI-BpIPLLMuEnjVVo6ghLvHyzh_E9fuoUzSDNcgGtO19nQ4pKZlDr6ve7gQwBgnAxZhIXHsAYPnbjCGnMw7Tt5WZ7_3nqz3MinI05j_FwE6skAUw" 
        //+ await getAccessToken(),//userHashedId(),
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
