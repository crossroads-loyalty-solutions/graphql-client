/* @flow */

import type { GraphQLError } from "./graphql";

export type RequestError = Error & {
  name: "RequestError",
  response: Response,
  statusCode: number,
  bodyText: string,
};

export type ParseError = Error & {
  name: "ParseError",
  response: Response,
  statusCode: number,
  bodyText: string,
};

export type QueryError = Error & {
  name: "QueryError",
  errors: Array<GraphQLError>,
};

const graphqlErrorMessage = ({ message }: GraphQLError): string => message;

export const requestError = (
  response: Response,
  bodyText: string,
  message: mixed
): RequestError => {
  const e: RequestError = (new Error(message): any);

  e.name = "RequestError";
  e.response = response;
  e.statusCode = response.status;
  e.bodyText = bodyText;

  return e;
};

export const parseError = (response: Response, bodyText: string, message: mixed): ParseError => {
  const e: ParseError = (new Error(message): any);

  e.name = "ParseError";
  e.response = response;
  e.statusCode = response.status;
  e.bodyText = bodyText;

  return e;
};

export const queryError = (errors: Array<GraphQLError>): QueryError => {
  const e: QueryError = (new Error(errors.map(graphqlErrorMessage).join(", ")): any);

  e.name = "QueryError";
  e.errors = errors;

  return e;
};
