import OrderStatus from '../../../src/orders/model/OrderStatus';
import { expect } from 'chai';

describe('OrderStatus', () => {
  it('OPEN', () => {
    expect(OrderStatus.OPEN).to.equal('OPEN');
  });

  it('IN_PROGRESS', () => {
    expect(OrderStatus.IN_PROGRESS).to.equal('IN_PROGRESS');
  });

  it('CLOSED', () => {
    expect(OrderStatus.CLOSED).to.equal('CLOSED');
  });
});