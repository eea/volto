/**
 * Workflow reducer.
 * @module reducers/workflow/workflow
 */

import {
  TRANSITION_WORKFLOW,
  GET_WORKFLOW,
  GET_WORKFLOW_MULTIPLE,
  GET_CONTENT,
} from '../../constants/ActionTypes';

const initialState = {
  get: {
    loaded: false,
    loading: false,
    error: null,
  },
  transition: {
    loaded: false,
    loading: false,
    error: null,
  },
  history: [],
  transitions: [],
  multiple: [],
};

/**
 * Get request key
 * @function getRequestKey
 * @param {string} actionType Action type.
 * @returns {string} Request key.
 */
function getRequestKey(actionType) {
  return actionType.split('_')[0].toLowerCase();
}

/**
 * Content reducer.
 * @function content
 * @param {Object} state Current state.
 * @param {Object} action Action to be handled.
 * @returns {Object} New state.
 */
export default function content(state = initialState, action = {}) {
  switch (action.type) {
    case `${GET_WORKFLOW}_PENDING`:
    case `${GET_WORKFLOW_MULTIPLE}_PENDING`:
    case `${TRANSITION_WORKFLOW}_PENDING`:
    case `${GET_CONTENT}_PENDING`:
      return {
        ...state,
        [getRequestKey(action.type)]: {
          loading: true,
          loaded: false,
          error: null,
        },
      };
    case `${GET_WORKFLOW}_SUCCESS`:
    case `${TRANSITION_WORKFLOW}_SUCCESS`:
    case `${GET_CONTENT}_SUCCESS`:
      const result = action.result['@components']?.workflow || action.result;
      return {
        ...state,
        history: result.history ? result.history : state.history,
        transitions: result.transitions
          ? result.transitions
          : state.transitions,
        [getRequestKey(action.type)]: {
          loading: false,
          loaded: true,
          error: null,
        },
      };
    case `${GET_WORKFLOW_MULTIPLE}_SUCCESS`:
      return {
        ...state,
        multiple: action.result,
        [getRequestKey(action.type)]: {
          loading: false,
          loaded: true,
          error: null,
        },
      };
    case `${GET_WORKFLOW}_FAIL`:
    case `${TRANSITION_WORKFLOW}_FAIL`:
    case `${GET_CONTENT}_FAIL`:
      return {
        ...state,
        history: [],
        transitions: [],
        [getRequestKey(action.type)]: {
          loading: false,
          loaded: false,
          error: action.error,
        },
      };
    case `${GET_WORKFLOW_MULTIPLE}_FAIL`:
      return {
        ...state,
        multiple: [],
        [getRequestKey(action.type)]: {
          loading: false,
          loaded: false,
          error: action.error,
        },
      };
    default:
      return state;
  }
}
