import React from 'react';

export const FormStateContext = React.createContext();

export const FormStateProvider = (props) => {
  const { initialValue } = props;
  const [contextData, setContextData] = React.useState(initialValue);

  const logger = (val) => {
    // console.log('Setting contentData to:', val);
    return setContextData({ ...contextData, ...val });
  };

  return (
    <FormStateContext.Provider value={{ contextData, setContextData: logger }}>
      {props.children}
    </FormStateContext.Provider>
  );
};

export const useFormStateContext = () => {
  const context = React.useContext(FormStateContext);

  if (!context) {
    throw new Error(
      `The \`useFormStateContext\` hook must be used inside the <FormStateProvider> component's context.`,
    );
  }

  return context;
  // const [contentData, setContentData] = context;
  // return editor;
};
