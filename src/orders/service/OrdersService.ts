import Order from '../model/Order';
import OrderStatus from '../model/OrderStatus';
import OrdersPage from '../model/OrdersPage';
import OrdersQueryRequest from '../model/OrdersQueryRequest';
import OrdersQueryRequestByBusinessId from '../model/OrdersQueryRequestByBusinessId';
import OrdersQueryRequestByChannel from '../model/OrdersQueryRequestByChannel';
import OrdersQueryRequestByChannelOrderId from '../model/OrdersQueryRequestByChannelOrderId';
import LineItem from '../model/LineItem';
import Fulfillment from '../model/Fulfillment';
import RequestClientWrapper from '../../RequestClientWrapper';
import * as request from 'request';
import Resource from '../../model/Resource';
import Version from '../../model/Version';
import RequestCallbackParams from '../../model/RequestCallbackParams';
import GenerateApiError from '../../utils/GenerateApiError';
import * as Q from 'q';

const EXPECTED_GET_STATUS = 200;
const EXPECTED_UPDATE_STATUS = 202;

type GenericOrdersQueryRequest =
  OrdersQueryRequestByBusinessId | OrdersQueryRequestByChannel | OrdersQueryRequestByChannelOrderId;

export default class OrdersService {

  constructor(private readonly client: RequestClientWrapper) { }

  public get(orderId: string): Promise<Order>;
  public get(ordersRequestByBusinessId: OrdersQueryRequestByBusinessId): Promise<Order[]>;
  public get(ordersRequestByChannel: OrdersQueryRequestByChannel): Promise<Order[]>;
  public get(ordersRequestByChannelOrderId: OrdersQueryRequestByChannelOrderId): Promise<Order[]>;
  public get(orderIdOrRequest: string | GenericOrdersQueryRequest): Promise<Order> | Promise<Order[]> {
    if (typeof orderIdOrRequest === 'string') {
      return this.getByOrderId(orderIdOrRequest);
    }
    const deferred: Q.Deferred<Order[]> = Q.defer<Order[]>();
    const getSinglePage = false;
    this.getOrdersByRequest(orderIdOrRequest, [], deferred, getSinglePage);
    return deferred.promise as any;
  }

  public getPage(ordersRequestByBusinessId: OrdersQueryRequestByBusinessId): Promise<OrdersPage>;
  public getPage(ordersRequestByChannel: OrdersQueryRequestByChannel): Promise<OrdersPage>;
  public getPage(ordersRequestByChannelOrderId: OrdersQueryRequestByChannelOrderId): Promise<OrdersPage>;
  public getPage(orderRequest: OrdersQueryRequestByBusinessId | OrdersQueryRequestByChannel |
    OrdersQueryRequestByChannelOrderId): Promise<OrdersPage> {
    const deferred = Q.defer<OrdersPage>();
    const getSinglePage = true;
    this.getOrdersByRequest(orderRequest, [], deferred, getSinglePage);
    return deferred.promise as any;
  }

  public update(order: Order): Promise<Order> {
    const deferred = Q.defer<Order>();
    const requestUrl = `${Version.V1}${Resource.ORDERS}/${order.id}`;
    const options: request.CoreOptions = {
      body: order
    };
    this.client.put(requestUrl, options, (error, response, body) => {
      this.mapOrderPromise(requestUrl, deferred, error, response, body, EXPECTED_UPDATE_STATUS);
    });
    return deferred.promise as any;
  }

  private getByOrderId(orderId: string): Promise<Order> {
    const deferred = Q.defer<Order>();
    const requestUrl = `/${Version.V1}${Resource.ORDERS}/${orderId}`;
    this.client.get(requestUrl, (error, response, body) => {
      this.mapOrderPromise(requestUrl, deferred, error, response, body, EXPECTED_GET_STATUS);
    });
    return deferred.promise as any;
  }

  private getOrdersByRequest(ordersRequest: OrdersQueryRequestByBusinessId | OrdersQueryRequestByChannel |
    OrdersQueryRequestByChannelOrderId, orders: Order[], deferred: Q.Deferred<any>, getSinglePage: boolean): void {
    const requestUrl = `/${Version.V1}${Resource.ORDERS}`;
    const ordersQueryParams = ordersRequest as any;
    if (ordersQueryParams.startDate != null && typeof ordersQueryParams.startDate !== 'string') {
      ordersQueryParams.startDate = ordersQueryParams.startDate.toISOString();
    }
    if (ordersQueryParams.endDate != null && typeof ordersQueryParams.endDate !== 'string') {
      ordersQueryParams.endDate = ordersQueryParams.endDate.toISOString();
    }
    const options: request.CoreOptions = {
      qs: ordersQueryParams
    };
    this.client.get(requestUrl, options, (error, response, body) => {
      const requestResponse: RequestCallbackParams = {
        error,
        response,
        body
      };
      this.mapOrdersPromise(requestUrl, deferred, requestResponse, orders, ordersRequest, EXPECTED_GET_STATUS,
          getSinglePage);
    });
  }

  private mapOrderPromise(requestUrl: string, deferred: Q.Deferred<Order>, error: any, response: request.Response,
    body: any, expectedStatusCode: number) {
    if (error) {
      deferred.reject(error);
    } else if (response.statusCode === expectedStatusCode) {
      const order: Order = this.formatOrder(body);
      deferred.resolve(order);
    } else {
      const channelApeErrorResponse = GenerateApiError(requestUrl, response, body, EXPECTED_UPDATE_STATUS);
      deferred.reject(channelApeErrorResponse);
    }
  }

  private mapOrdersPromise(
    requestUrl: string,
    deferred: Q.Deferred<any>, requestCallbackParams: RequestCallbackParams,
    orders: Order[],
    ordersRequest: GenericOrdersQueryRequest | (OrdersQueryRequestByChannelOrderId & OrdersQueryRequest),
    expectedStatusCode: number,
    getSinglePage: boolean
  ): void {
    if (requestCallbackParams.error) {
      deferred.reject(requestCallbackParams.error);
    } else if (requestCallbackParams.response.statusCode === expectedStatusCode) {
      const data: OrdersPage = requestCallbackParams.body as OrdersPage;
      const mergedOrders: Order[] = orders.concat(data.orders);
      if (getSinglePage) {
        deferred.resolve({
          orders: mergedOrders.map(o => this.formatOrder(o)),
          pagination: data.pagination
        });
      } else if (data.pagination.lastPage) {
        const ordersToReturn = mergedOrders.map(o => this.formatOrder(o));
        deferred.resolve(ordersToReturn);
      } else {
        const newOrdersRequest: GenericOrdersQueryRequest |
          (OrdersQueryRequestByChannelOrderId & OrdersQueryRequest) = {
            ...ordersRequest,
            lastKey: data.pagination.lastKey
          };
        this.getOrdersByRequest(newOrdersRequest, mergedOrders, deferred, getSinglePage);
      }
    } else {
      const channelApeErrorResponse =
        GenerateApiError(requestUrl, requestCallbackParams.response, requestCallbackParams.body,
            EXPECTED_UPDATE_STATUS);
      deferred.reject(channelApeErrorResponse);
    }
  }

  private formatOrder(order: any): Order {
    order.purchasedAt = new Date(order.purchasedAt);
    if (order.canceledAt != null) {
      order.canceledAt = new Date(order.canceledAt);
    }
    order.updatedAt = new Date(order.updatedAt);
    order.createdAt = new Date(order.createdAt);
    order.status = order.status as OrderStatus;
    order.totalPrice = Number(order.totalPrice);
    order.subtotalPrice = Number(order.subtotalPrice);
    order.totalShippingPrice = Number(order.totalShippingPrice);
    if (typeof order.totalShippingTax !== 'undefined') {
      order.totalShippingTax = Number(order.totalShippingTax);
    }
    order.totalTax = Number(order.totalTax);
    order.totalGrams = Number(order.totalGrams);
    order.lineItems = order.lineItems.map(this.formatLineItem);
    order.fulfillments = order.fulfillments.map((f: any) => this.formatFulfillment(f));
    return order as Order;
  }

  private formatFulfillment(fulfillment: Fulfillment): Fulfillment {
    fulfillment.lineItems = fulfillment.lineItems.map(this.formatLineItem);
    return fulfillment;
  }

  private formatLineItem(lineItem: LineItem): LineItem {
    lineItem.grams = Number(lineItem.grams);
    lineItem.price = Number(lineItem.price);
    return lineItem;
  }
}
