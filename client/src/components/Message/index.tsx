interface IMessageObject {
  info: () => void;
  success: () => void;
  error: () => void;
  destroy: () => void;
}

const useMessage(): [ IMessageObject, Holder ] {

};

export {
  useMessage,
}
