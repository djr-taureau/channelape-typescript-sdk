import * as request from 'request';

export default interface RequestCallbackParams {
  error: any;
  response: request.Response;
  body: any;
}
