/**
 * TextWidget component.
 * @module components/manage/Widgets/TextWidget
 */

import { FormFieldWrapper, Icon } from '@plone/volto/components';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import { Icon as IconOld, Input } from 'semantic-ui-react';

const messages = defineMessages({
  default: {
    id: 'Default',
    defaultMessage: 'Default',
  },
  idTitle: {
    id: 'Short Name',
    defaultMessage: 'Short Name',
  },
  idDescription: {
    id: 'Used for programmatic access to the fieldset.',
    defaultMessage: 'Used for programmatic access to the fieldset.',
  },
  title: {
    id: 'Title',
    defaultMessage: 'Title',
  },
  description: {
    id: 'Description',
    defaultMessage: 'Description',
  },
  required: {
    id: 'Required',
    defaultMessage: 'Required',
  },
  delete: {
    id: 'Delete',
    defaultMessage: 'Delete',
  },
});

const typeTranslations = {
  integer: 'number',
  string: 'text',
};

/**
 * TextWidget component class.
 * @class TextWidget
 * @extends Component
 */
class TextWidget extends Component {
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
  static propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    required: PropTypes.bool,
    error: PropTypes.arrayOf(PropTypes.string),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    focus: PropTypes.bool,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    onClick: PropTypes.func,
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
    icon: PropTypes.shape({
      xmlns: PropTypes.string,
      viewBox: PropTypes.string,
      content: PropTypes.string,
    }),
    iconAction: PropTypes.func,
    type: PropTypes.string,
    minLength: PropTypes.number,
    maxLength: PropTypes.number,
    maximum: PropTypes.number,
    minimum: PropTypes.number,
    wrapped: PropTypes.bool,
    placeholder: PropTypes.string,
  };

  /**
   * Default properties.
   * @property {Object} defaultProps Default properties.
   * @static
   */
  static defaultProps = {
    description: null,
    required: false,
    error: [],
    value: null,
    onChange: () => {},
    onBlur: () => {},
    onClick: () => {},
    onEdit: null,
    onDelete: null,
    focus: false,
    icon: null,
    iconAction: null,
    type: '',
    minLength: null,
    maxLength: null,
    minimum: null,
    maximum: null,
  };

  /**
   * Component did mount lifecycle method
   * @method componentDidMount
   * @returns {undefined}
   */
  componentDidMount() {
    if (this.props.focus) {
      this.node.focus();
    }
  }

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
  render() {
    const {
      id,
      value,
      onChange,
      onBlur,
      onClick,
      onEdit,
      onDelete,
      intl,
      icon,
      iconAction,
      type,
      minLength,
      maxLength,
      minimum,
      maximum,
      placeholder,
    } = this.props;

    const schema = {
      fieldsets: [
        {
          id: 'default',
          title: intl.formatMessage(messages.default),
          fields: ['title', 'id', 'description', 'required'],
        },
      ],
      properties: {
        id: {
          type: 'string',
          title: intl.formatMessage(messages.idTitle),
          description: intl.formatMessage(messages.idDescription),
        },
        title: {
          type: 'string',
          title: intl.formatMessage(messages.title),
        },
        description: {
          type: 'string',
          widget: 'textarea',
          title: intl.formatMessage(messages.description),
        },
        required: {
          type: 'boolean',
          title: intl.formatMessage(messages.required),
        },
      },
      required: ['id', 'title'],
    };

    return (
      <FormFieldWrapper {...this.props} draggable={true} className="text">
        {onEdit && (
          <div className="toolbar">
            <button
              className="item ui noborder button"
              onClick={() => onEdit(id, schema)}
            >
              <IconOld name="write square" size="large" color="blue" />
            </button>
            <button
              aria-label={this.props.intl.formatMessage(messages.delete)}
              className="item ui noborder button"
              onClick={() => onDelete(id)}
            >
              <IconOld name="close" size="large" color="red" />
            </button>
          </div>
        )}
        <Input
          id={`field-${id}`}
          name={id}
          value={value || ''}
          disabled={onEdit !== null}
          icon={icon || null}
          placeholder={placeholder}
          onChange={({ target }) =>
            onChange(id, target.value === '' ? undefined : target.value)
          }
          ref={(node) => {
            this.node = node;
          }}
          onBlur={({ target }) =>
            onBlur(id, target.value === '' ? undefined : target.value)
          }
          onClick={() => onClick()}
          type={typeTranslations[type] || type}
          step={type === 'number' ? 'any' : type === 'integer' ? '1' : null}
          min={minimum || null}
          max={maximum || null}
        >
          <input minLength={minLength || null} maxLength={maxLength || null} />
        </Input>
        {icon && iconAction && (
          <button onClick={iconAction}>
            <Icon name={icon} size="18px" />
          </button>
        )}
      </FormFieldWrapper>
    );
  }
}

export default injectIntl(TextWidget);
