import AdditionalField from '../../model/AdditionalField';

export default interface LineItem {
  additionalFields?: AdditionalField[];
  grams?: number;
  id: string;
  price?: number;
  shippingPrice?: number;
  shippingtax?: number;
  quantity: number;
  shippingMethod?: string;
  sku?: string;
  upc?: string;
  title: string;
  vendor?: string;
}
