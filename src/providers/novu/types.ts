export type NovuPerson = {
  id?: string;
  subscriberId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
};

export type NovuPayloadNotification = {
  title?: string;
  message?: string;
  iconUrl?: string;
};

export type NovuPayloadAction = {
  label?: string;
  url?: string;
};

export type NovuPayload = {
  notification?: NovuPayloadNotification;
  action?: NovuPayloadAction;
  actor?: NovuPerson;
  subscriber?: NovuPerson;
};

export type NovuRedirect = {
  url?: string;
  target?: "_self" | "_blank" | "_parent" | "_top" | "_unfencedTop";
};

export type NovuAction = {
  label?: string;
  isCompleted?: boolean;
  redirect?: NovuRedirect | null;
};

export type NovuWorkflow = {
  id?: string;
  identifier?: string;
  name?: string;
  critical?: boolean;
  tags?: string[];
};

export type NovuNotification = {
  id: string;
  subject?: string | null;
  body?: string | null;
  createdAt: string;
  isRead: boolean;
  isArchived?: boolean;
  isSnoozed?: boolean;
  data?: NovuPayload & Record<string, unknown>;
  workflow?: NovuWorkflow | null;
  channelType?: string;
  redirect?: NovuRedirect | null;
  primaryAction?: NovuAction | null;
  secondaryAction?: NovuAction | null;
  avatar?: string;
  to?: NovuPerson;
  actor?: NovuPerson;
};

export type NovuListQuery = {
  archived?: boolean;
  read?: boolean;
};
