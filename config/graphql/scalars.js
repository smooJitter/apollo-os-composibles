// config/graphql/scalars.js
import { GraphQLDateTime, GraphQLEmailAddress, GraphQLJSONObject } from 'graphql-scalars';

export const customScalars = {
  DateTime: GraphQLDateTime,
  Email: GraphQLEmailAddress,
  JSONObject: GraphQLJSONObject,
};

// You can add more custom scalars here as needed.
