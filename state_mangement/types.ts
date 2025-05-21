export type MyGlobalState = {
  participantListVisible: boolean;
  massControlVisible: boolean;
};

export type MyGlobalAction =
  | { type: 'participantListVisibleToggle' }
  | { type: 'massControlVisibleToggle' };

export type MyGlobalContextType = {
  state: MyGlobalState;
  dispatch: React.Dispatch<MyGlobalAction>;
};