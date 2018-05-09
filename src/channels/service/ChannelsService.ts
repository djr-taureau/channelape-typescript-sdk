

import request = require('request');
import Resource from '../../model/Resource';
import Channel from '../model/Channel';
import CreateChannelRequest from '../model/CreateChannelRequest';
import Version from '../../model/Version';
import ChannelApeErrorResponse from './../../model/ChannelApeErrorResponse';
import * as Q from 'q';

export default class ChannelsService {

  constructor(private readonly client: request.RequestAPI<request.Request, 
    request.CoreOptions, request.RequiredUriUrl>) { }

  public get(channelId: string): Q.Promise<Channel> {
    const deferred = Q.defer<Channel>();
    const requestUrl = `/${Version.V1}${Resource.CHANNELS}/${channelId}`;
    this.client.get(requestUrl, (error, response, body) => {
      this.mapPromise(deferred, error, response, body, 200);
    });
    return deferred.promise;
  }

  public create(createChannelRequest: CreateChannelRequest): Q.Promise<Channel> {
    const deferred = Q.defer<Channel>();

    const requestUrl = `/${Version.V1}${Resource.CHANNELS}`;
    const options: request.CoreOptions = {
      body: createChannelRequest // TODO: assert me
    };
    this.client.post(requestUrl, options, (error, response, body) => {
      this.mapPromise(deferred, error, response, body, 201);
    });

    return deferred.promise;
  }

  private mapPromise(deferred: Q.Deferred<Channel>, error: any, response: request.Response, body : any, 
    expectedStatusCode: number) {
    if (error) {
      deferred.reject(error);
    } else if (response.statusCode === expectedStatusCode) {
      const channel = body as Channel;
      channel.createdAt = new Date(body.createdAt);
      channel.updatedAt = new Date(body.updatedAt);
      deferred.resolve(channel);
    } else {
      const channelApeErrorResponse = body as ChannelApeErrorResponse;
      channelApeErrorResponse.statusCode = response.statusCode;
      deferred.reject(channelApeErrorResponse);
    }
  }
}
