/**
 * Navigation reducer.
 * @module reducers/navigation/navigation
 */

import { map } from 'lodash';
import { settings } from '~/config';

import {
  GET_NAVIGATION,
  GET_CONTENT,
} from '@plone/volto/constants/ActionTypes';

const initialState = {
  error: null,
  items: [],
  loaded: false,
  loading: false,
};

/**
 * Recursive function that process the items returned by the navigation
 * endpoint
 * @function getRecursiveItems
 * @param {array} items The items inside a navigation response.
 * @returns {*} The navigation items object (recursive)
 */
function getRecursiveItems(items) {
  return map(items, (item) => ({
    title: item.title,
    url: item['@id'].replace(settings.apiPath, ''),
    ...(item.items && { items: getRecursiveItems(item.items) }),
  }));
}

/**
 * Navigation reducer.
 * @function navigation
 * @param {Object} state Current state.
 * @param {Object} action Action to be handled.
 * @returns {Object} New state.
 */
export default function navigation(state = initialState, action = {}) {
  const actionTypes = {
    withContent: {
      [`${GET_CONTENT}_PENDING`]: {
        data: () =>
          !action.subrequest && settings.minimizeNetworkFetch
            ? { ...state, error: null, loaded: false, loading: true }
            : state,
      },
      [`${GET_CONTENT}_FAIL`]: {
        data: () =>
          !action.subrequest && settings.minimizeNetworkFetch
            ? {
                ...state,
                error: action.error,
                items: [],
                loaded: false,
                loading: false,
              }
            : state,
      },
      [`${GET_CONTENT}_SUCCESS`]: {
        data: () =>
          !action.subrequest && settings.minimizeNetworkFetch
            ? {
                ...state,
                error: null,
                items: getRecursiveItems(
                  action.result['@components'].navigation.items,
                ),
                loaded: true,
                loading: false,
              }
            : state,
      },
    },
    [`${GET_NAVIGATION}_PENDING`]: {
      data: () => ({
        ...state,
        error: null,
        loaded: false,
        loading: true,
      }),
    },

    [`${GET_NAVIGATION}_FAIL`]: {
      data: () => ({
        ...state,
        error: action.error,
        items: [],
        loaded: false,
        loading: false,
      }),
    },

    [`${GET_NAVIGATION}_SUCCESS`]: {
      data: () => ({
        ...state,
        error: null,
        items: getRecursiveItems(action.result.items),
        loaded: true,
        loading: false,
      }),
    },
  };

  let currentType;

  if (settings.contentExpand.includes('navigation')) {
    currentType =
      actionTypes.withContent[action.type] || actionTypes[action.type];
  } else {
    currentType = actionTypes[action.type];
  }

  return currentType?.data() || state;
}
