// config/graphql/scalars.js
import { GraphQLDateTime, GraphQLEmailAddress, GraphQLJSONObject } from 'graphql-scalars';
import { GraphQLScalarType, Kind, GraphQLID } from 'graphql';
import { GraphQLMongoID } from 'graphql-compose-mongoose';

export const customScalars = {
  DateTime: GraphQLDateTime,
  Email: GraphQLEmailAddress,
  JSONObject: GraphQLJSONObject,
  ID: GraphQLID,
  MongoID: GraphQLMongoID
};

// You can add more custom scalars here as needed.
