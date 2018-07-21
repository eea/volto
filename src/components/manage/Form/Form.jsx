/**
 * Form component.
 * @module components/manage/Form/Form
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { keys, map, mapValues, omit, uniq, without } from 'lodash';
import move from 'lodash-move';
import {
  Button,
  Container,
  Dropdown,
  Form as UiForm,
  Segment,
  Tab,
  Message,
} from 'semantic-ui-react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import { v4 as uuid } from 'uuid';
import DiffMatchPatch from 'diff-match-patch';

import { EditTile, Field } from '../../../components';
import config, { AvailableTiles, messagesTiles } from '../../../config';
import { Api, getBaseUrl } from '../../../helpers';

const messages = defineMessages({
  addTile: {
    id: 'Add tile...',
    defaultMessage: 'Add tile...',
  },
  required: {
    id: 'Required input is missing.',
    defaultMessage: 'Required input is missing.',
  },
  minLength: {
    id: 'Minimum length is {len}.',
    defaultMessage: 'Minimum length is {len}.',
  },
  uniqueItems: {
    id: 'Items must be unique.',
    defaultMessage: 'Items must be unique.',
  },
  save: {
    id: 'Save',
    defaultMessage: 'Save',
  },
  cancel: {
    id: 'Cancel',
    defaultMessage: 'Cancel',
  },
  error: {
    id: 'Error',
    defaultMessage: 'Error',
  },
  thereWereSomeErrors: {
    id: 'There were some errors.',
    defaultMessage: 'There were some errors.',
  },
});
const dmp = new DiffMatchPatch();

/**
 * Split fieldname
 * @function splitFieldname
 * @param {string} field Field name``
 * @returns {Object} values
 */
function splitFieldname(field) {
  if (field.indexOf('.') === -1) {
    return {
      fieldset: null,
      field,
    };
  }
  const index = field.lastIndexOf('.');
  return {
    fieldset: field.slice(0, index),
    field: field.slice(index + 1),
  };
}

/**
 * Form container class.
 * @class Form
 * @extends Component
 */
class Form extends Component {
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
  static propTypes = {
    schema: PropTypes.shape({
      fieldsets: PropTypes.arrayOf(
        PropTypes.shape({
          fields: PropTypes.arrayOf(PropTypes.string),
          id: PropTypes.string,
          title: PropTypes.string,
        }),
      ),
      properties: PropTypes.objectOf(PropTypes.any),
      definitions: PropTypes.objectOf(PropTypes.any),
      required: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    formData: PropTypes.objectOf(PropTypes.any),
    pathname: PropTypes.string,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
    submitLabel: PropTypes.string,
    resetAfterSubmit: PropTypes.bool,
    intl: intlShape.isRequired,
    title: PropTypes.string,
    error: PropTypes.shape({
      message: PropTypes.string,
    }),
    loading: PropTypes.bool,
    hideActions: PropTypes.bool,
    description: PropTypes.string,
    visual: PropTypes.bool,
    tiles: PropTypes.arrayOf(PropTypes.object),
  };

  /**
   * Default properties.
   * @property {Object} defaultProps Default properties.
   * @static
   */
  static defaultProps = {
    formData: null,
    onSubmit: null,
    onCancel: null,
    submitLabel: null,
    resetAfterSubmit: false,
    title: null,
    description: null,
    error: null,
    loading: null,
    hideActions: false,
    visual: false,
    tiles: [],
    pathname: '',
  };

  /**
   * Constructor
   * @method constructor
   * @param {Object} props Component properties
   * @constructs Form
   */
  constructor(props) {
    super(props);
    const ids = {
      title: uuid(),
      description: uuid(),
      text: uuid(),
    };
    let { formData } = props;
    if (formData === null) {
      // get defaults from schema
      formData = mapValues(props.schema.properties, 'default');
    }
    // defaults for block editor; should be moved to schema on server side
    if (!formData.tiles_layout) {
      formData.tiles_layout = { items: [ids.title, ids.description, ids.text] };
    }
    if (!formData.tiles) {
      formData.tiles = {
        [ids.title]: {
          '@type': 'title',
        },
        [ids.description]: {
          '@type': 'description',
        },
        [ids.text]: {
          '@type': 'text',
          text: {
            'content-type': 'text/html',
            data: '',
            encoding: 'utf8',
          },
        },
      };
    }
    this.state = {
      formData,
      errors: {},
      selected: null,
    };
    this.onChangeField = this.onChangeField.bind(this);
    this.onChangeTile = this.onChangeTile.bind(this);
    this.onSelectTile = this.onSelectTile.bind(this);
    this.onDeleteTile = this.onDeleteTile.bind(this);
    this.onAddTile = this.onAddTile.bind(this);
    this.onMoveTile = this.onMoveTile.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  /**
   * Component did mount
   * @method componentDidMount
   * @returns {undefined}
   */
  componentDidMount() {
    if (config.websockets) {
      new Api().get('/@wstoken').then(res => {
        this.socket = new WebSocket(
          `${config.apiPath}${getBaseUrl(
            this.props.pathname,
          )}/@ws-edit?ws_token=${res.token}`.replace('http', 'ws'),
        );
        this.socket.onopen = () => console.log('open');
        this.socket.onclose = () => console.log('close');
        this.socket.onmessage = message => {
          console.log('message received');
          const packet = JSON.parse(message);
          if (packet.t === 'dmp') {
            console.log('dmp received');
            this.onChangeField(
              packet.f,
              dmp.patch_apply(
                dmp.patch_fromText(packet.v),
                this.state.formData[packet.f],
              )[0],
              false,
            );
          }
          console.log(message);
        };
      });
    }
  }

  /**
   * Component will unmount
   * @method componentWillUnmount
   * @returns {undefined}
   */
  componentWillUnmount() {
    if (this.socket) {
      this.socket.close();
    }
  }

  /**
   * Change field handler
   * @method onChangeField
   * @param {string} id Id of the field
   * @param {*} value Value of the field
   * @param {bool} send Send on socket
   * @returns {undefined}
   */
  onChangeField(id, value, send = true) {
    const { fieldset, field } = splitFieldname(id);
    let oldValue;
    if (fieldset) {
      oldValue = this.state.formData[fieldset][field];
      this.setState({
        formData: {
          ...this.state.formData,
          [fieldset]: {
            ...this.state.formData[fieldset],
            [field]: value || null,
          },
        },
      });
    } else {
      oldValue = this.state.formData[field];
      this.setState({
        formData: {
          ...this.state.formData,
          [field]: value || null,
        },
      });
    }
    if (config.websockets && send) {
      const message = JSON.stringify({
        t: 'dmp',
        f: id,
        v: dmp.patch_toText(dmp.patch_make(oldValue, value)),
      });
      new Promise((resolve, reject) => {
        switch (socket.readyState) {
          case socket.CONNECTING:
            socket.addEventListener('open', () => resolve(socket));
            socket.addEventListener('error', reject);
            break;
          case socket.OPEN:
            resolve(socket);
            break;
          default:
            reject();
            break;
        }
      }).then(() => {
        console.log(message);
        this.socket.send(message);
      });
    }
  }

  /**
   * Change tile handler
   * @method onChangeTile
   * @param {string} id Id of the tile
   * @param {*} value Value of the field
   * @returns {undefined}
   */
  onChangeTile(id, value) {
    this.setState({
      formData: {
        ...this.state.formData,
        tiles: {
          ...this.state.formData.tiles,
          [id]: value || null,
        },
      },
    });
  }

  /**
   * Select tile handler
   * @method onSelectTile
   * @param {string} id Id of the field
   * @returns {undefined}
   */
  onSelectTile(id) {
    this.setState({
      selected: id,
    });
  }

  /**
   * Delete tile handler
   * @method onDeleteTile
   * @param {string} id Id of the field
   * @param {bool} selectPrev True if previous should be selected
   * @returns {undefined}
   */
  onDeleteTile(id, selectPrev) {
    this.setState({
      formData: {
        ...this.state.formData,
        tiles_layout: {
          items: without(this.state.formData.tiles_layout.items, id),
        },
        tiles: omit(this.state.formData.tiles, [id]),
      },
      selected: selectPrev
        ? this.state.formData.tiles_layout.items[
            this.state.formData.tiles_layout.items.indexOf(id) - 1
          ]
        : null,
    });
  }

  /**
   * Add tile handler
   * @method onAddTile
   * @param {string} type Type of the tile
   * @param {Number} index Index where to add the tile
   * @returns {string} Id of the tile
   */
  onAddTile(type, index) {
    const id = uuid();
    const insert =
      index === -1 ? this.state.formData.tiles_layout.items.length : index;

    this.setState({
      formData: {
        ...this.state.formData,
        tiles_layout: {
          items: [
            ...this.state.formData.tiles_layout.items.slice(0, insert),
            id,
            ...this.state.formData.tiles_layout.items.slice(insert),
          ],
        },
        tiles: {
          ...this.state.formData.tiles,
          [id]: {
            '@type': type,
          },
        },
      },
      selected: id,
    });

    return id;
  }

  /**
   * Submit handler
   * @method onSubmit
   * @param {Object} event Event object.
   * @returns {undefined}
   */
  onSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const errors = {};
    map(this.props.schema.fieldsets, fieldsetObject =>
      map(fieldsetObject.fields, fieldId => {
        const { fieldset, field } = splitFieldname(fieldId);
        const fieldObject = fieldset
          ? this.props.schema.definitions[fieldset].properties[field]
          : this.props.schema.properties[field];

        const data = fieldset
          ? this.state.formData[fieldset] &&
            this.state.formData[fieldset][field]
          : this.state.formData[field];
        if (this.props.schema.required.indexOf(fieldId) !== -1) {
          if (fieldObject.type !== 'boolean' && !data) {
            errors[fieldId] = errors[fieldObject] || [];
            errors[fieldId].push(
              this.props.intl.formatMessage(messages.required),
            );
          }
          if (fieldObject.minLength && data.length < fieldObject.minLength) {
            errors[fieldId] = errors[fieldId] || [];
            errors[fieldId].push(
              this.props.intl.formatMessage(messages.minLength, {
                len: fieldObject.minLength,
              }),
            );
          }
        }
        if (
          fieldObject.uniqueItems &&
          data &&
          uniq(data).length !== data.length
        ) {
          errors[fieldId] = errors[fieldId] || [];
          errors[fieldId].push(
            this.props.intl.formatMessage(messages.uniqueItems),
          );
        }
      }),
    );
    if (keys(errors).length > 0) {
      this.setState({
        errors,
      });
    } else {
      this.props.onSubmit(this.state.formData);
      if (this.props.resetAfterSubmit) {
        this.setState({
          formData: this.props.formData,
        });
      }
    }
  }

  /**
   * Move tile handler
   * @method onMoveTile
   * @param {number} dragIndex Drag index.
   * @param {number} hoverIndex Hover index.
   * @returns {undefined}
   */
  onMoveTile(dragIndex, hoverIndex) {
    this.setState({
      formData: {
        ...this.state.formData,
        tiles_layout: {
          items: move(
            this.state.formData.tiles_layout.items,
            dragIndex,
            hoverIndex,
          ),
        },
      },
    });
  }

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
  render() {
    const { schema, onCancel, onSubmit } = this.props;
    const { formData } = this.state;

    return this.props.visual ? (
      <div className="ui wrapper">
        {map(formData.tiles_layout.items, (tile, index) => (
          <EditTile
            id={tile}
            index={index}
            type={formData.tiles[tile]['@type']}
            key={tile}
            onAddTile={this.onAddTile}
            onChangeTile={this.onChangeTile}
            onChangeField={this.onChangeField}
            onDeleteTile={this.onDeleteTile}
            onSelectTile={this.onSelectTile}
            onMoveTile={this.onMoveTile}
            properties={formData}
            data={formData.tiles[tile]}
            pathname={this.props.pathname}
            tile={tile}
            selected={this.state.selected === tile}
          />
        ))}
      </div>
    ) : (
      <Container>
        <UiForm
          method="post"
          onSubmit={this.onSubmit}
          error={keys(this.state.errors).length > 0}
        >
          <Segment.Group raised>
            {schema.fieldsets.length > 1 && (
              <Tab
                menu={{
                  secondary: true,
                  pointing: true,
                  attached: true,
                  tabular: true,
                }}
                panes={map(schema.fieldsets, item => ({
                  menuItem: item.title,
                  render: () => [
                    this.props.title && (
                      <Segment secondary attached>
                        {this.props.title}
                      </Segment>
                    ),
                    ...map(item.fields, id => {
                      const { fieldset, field } = splitFieldname(id);
                      return (
                        <Field
                          {...(fieldset
                            ? schema.definitions[fieldset].properties[field]
                            : schema.properties[field])}
                          id={id}
                          value={
                            fieldset
                              ? this.state.formData[fieldset] &&
                                this.state.formData[fieldset][field]
                              : this.state.formData[field]
                          }
                          required={schema.required.indexOf(id) !== -1}
                          onChange={this.onChangeField}
                          key={id}
                          error={this.state.errors[id]}
                        />
                      );
                    }),
                  ],
                }))}
              />
            )}
            {schema.fieldsets.length === 1 && (
              <Segment>
                {this.props.title && (
                  <Segment className="primary">{this.props.title}</Segment>
                )}
                {this.props.description && (
                  <Segment secondary>{this.props.description}</Segment>
                )}
                {keys(this.state.errors).length > 0 && (
                  <Message
                    icon="warning"
                    negative
                    attached
                    header={this.props.intl.formatMessage(messages.error)}
                    content={this.props.intl.formatMessage(
                      messages.thereWereSomeErrors,
                    )}
                  />
                )}
                {this.props.error && (
                  <Message
                    icon="warning"
                    negative
                    attached
                    header={this.props.intl.formatMessage(messages.error)}
                    content={this.props.error.message}
                  />
                )}
                {map(schema.fieldsets[0].fields, field => (
                  <Field
                    {...(field.indexOf('|') !== -1
                      ? schema.definitions[field.split('|')[0]].properties[
                          field.split('|')[1]
                        ]
                      : schema.properties[field])}
                    id={field}
                    value={
                      field.indexOf('|') !== -1
                        ? this.state.formData[field.split('|')[0]][
                            field.split('|')[1]
                          ]
                        : this.state.formData[field]
                    }
                    required={schema.required.indexOf(field) !== -1}
                    onChange={this.onChangeField}
                    key={field}
                    error={this.state.errors[field]}
                  />
                ))}
              </Segment>
            )}
            {!this.props.hideActions && (
              <Segment className="actions" clearing>
                {onSubmit && (
                  <Button
                    basic
                    circular
                    primary
                    floated="right"
                    icon="arrow right"
                    type="submit"
                    title={
                      this.props.submitLabel
                        ? this.props.submitLabel
                        : this.props.intl.formatMessage(messages.save)
                    }
                    size="big"
                    loading={this.props.loading}
                  />
                )}
                {onCancel && (
                  <Button
                    basic
                    circular
                    secondary
                    icon="remove"
                    title={this.props.intl.formatMessage(messages.cancel)}
                    floated="right"
                    size="big"
                    onClick={onCancel}
                  />
                )}
              </Segment>
            )}
          </Segment.Group>
        </UiForm>
      </Container>
    );
  }
}

export default injectIntl(Form, { withRef: true });
