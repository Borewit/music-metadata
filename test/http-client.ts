import { Readable } from "node:stream";
import { get as getHttps } from "node:https";
import { get as getHttp } from "node:http";

export interface IHttpResponse {
  headers: Record<string, string>;
  stream: Readable;
}

export interface HttpClient {
  get: (url: string) => Promise<IHttpResponse>;
}

export class NodeHttpClient implements HttpClient {
  public get(url: string): Promise<IHttpResponse> {
    return new Promise<IHttpResponse>((resolve, reject) => {
      const request = url.startsWith("https") ? getHttps(url) : getHttp(url);

      request.on("response", (response) =>
        resolve({
          headers: response.headers as Record<string, string>,
          stream: response,
        })
      );
      request.on("close", () => reject(new Error("close")));
      request.on("error", (err) => reject(err));
    });
  }
}
