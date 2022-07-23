export const addSubscription = (subscriptions: any[], cb: any) => {
  subscriptions.push(cb);
  return () => {
    subscriptions = subscriptions.filter((item) => item !== cb);
  };
};
export const triggerSubscription = (subscriptions: any[], ...args: any) => {
  subscriptions.forEach((cb) => cb(...args));
};
