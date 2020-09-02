/**
 * PasswordWidget component.
 * @module components/manage/Widgets/PassswordWidget
 */

import { FormFieldWrapper } from '@plone/volto/components';
import PropTypes from 'prop-types';
import React from 'react';
import { Input } from 'semantic-ui-react';
import { injectIntl } from 'react-intl';

/**
 * PasswordWidget component class.
 * @function PasswordWidget
 * @returns {string} Markup of the component.
 */
const PasswordWidget = (props) => {
  const { id, value, onChange, onBlur, onClick, minLength, maxLength } = props;
  return (
    <FormFieldWrapper {...props}>
      <Input
        id={`field-${id}`}
        name={id}
        type="password"
        disabled={props.isDisabled}
        value={value || ''}
        onChange={({ target }) =>
          onChange &&
          onChange(id, target.value === '' ? undefined : target.value)
        }
        onBlur={({ target }) =>
          onBlur && onBlur(id, target.value === '' ? undefined : target.value)
        }
        onClick={() => onClick && onClick()}
        minLength={minLength || null}
        maxLength={maxLength || null}
        autoComplete="off"
      />
    </FormFieldWrapper>
  );
};

/**
 * Property types.
 * @property {Object} propTypes Property types.
 * @static
 */
PasswordWidget.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onClick: PropTypes.func,
  minLength: PropTypes.number,
  maxLength: PropTypes.number,
  wrapped: PropTypes.bool,
};

/**
 * Default properties.
 * @property {Object} defaultProps Default properties.
 * @static
 */
PasswordWidget.defaultProps = {
  description: null,
  required: false,
  error: [],
  value: null,
  onChange: () => {},
  onBlur: () => {},
  onClick: () => {},
  minLength: null,
  maxLength: null,
};

export default injectIntl(PasswordWidget);
