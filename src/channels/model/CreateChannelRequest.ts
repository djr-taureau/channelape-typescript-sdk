import ChannelSettings from './ChannelSettings';

export default interface CreateChannelRequest {
  businessId: string;
  integrationId: string;
  name: string;
  enabled: boolean;
  credentials: {
    [key: string]: string;
  };
  settings: ChannelSettings;
}
  
