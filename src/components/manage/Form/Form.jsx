/**
 * Form component.
 * @module components/manage/Form/Form
 */

import { EditBlock, Field, Icon } from '@plone/volto/components';
import {
  difference,
  FormValidation,
  getBlocksFieldname,
  getBlocksLayoutFieldname,
  messages,
  blockHasValue,
} from '@plone/volto/helpers';
import aheadSVG from '@plone/volto/icons/ahead.svg';
import clearSVG from '@plone/volto/icons/clear.svg';
import dragSVG from '@plone/volto/icons/drag.svg';
import {
  findIndex,
  isEmpty,
  keys,
  map,
  mapValues,
  omit,
  pickBy,
  without,
} from 'lodash';
import move from 'lodash-move';
import isBoolean from 'lodash/isBoolean';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { injectIntl } from 'react-intl';
import { Portal } from 'react-portal';
import {
  Button,
  Container,
  Form as UiForm,
  Message,
  Segment,
  Tab,
} from 'semantic-ui-react';
import { v4 as uuid } from 'uuid';

import { settings } from '~/config';
import { withFormStateContext } from '@plone/volto/components/manage/Form/FormContext';
// import { FormStateContext, FormStateProvider } from './FormContext';

/**
 * Form container class.
 * @class Form
 * @extends Component
 */
export class Form extends Component {
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
    }),
    formData: PropTypes.objectOf(PropTypes.any),
    pathname: PropTypes.string,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
    submitLabel: PropTypes.string,
    resetAfterSubmit: PropTypes.bool,
    isEditForm: PropTypes.bool,
    isAdminForm: PropTypes.bool,
    title: PropTypes.string,
    error: PropTypes.shape({
      message: PropTypes.string,
    }),
    loading: PropTypes.bool,
    hideActions: PropTypes.bool,
    description: PropTypes.string,
    visual: PropTypes.bool,
    blocks: PropTypes.arrayOf(PropTypes.object),
    requestError: PropTypes.string,
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
    isEditForm: false,
    isAdminForm: false,
    title: null,
    description: null,
    error: null,
    loading: null,
    hideActions: false,
    visual: false,
    blocks: [],
    pathname: '',
    schema: {},
    requestError: null,
  };

  /**
   * Constructor
   * @method constructor
   * @param {Object} props Component properties
   * @constructs Form
   */
  constructor(props) {
    super(props);

    this.onChangeField = this.onChangeField.bind(this);
    this.onChangeBlock = this.onChangeBlock.bind(this);
    this.onMutateBlock = this.onMutateBlock.bind(this);
    this.onSelectBlock = this.onSelectBlock.bind(this);
    this.onDeleteBlock = this.onDeleteBlock.bind(this);
    this.onAddBlock = this.onAddBlock.bind(this);
    this.onMoveBlock = this.onMoveBlock.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onFocusPreviousBlock = this.onFocusPreviousBlock.bind(this);
    this.onFocusNextBlock = this.onFocusNextBlock.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    // We use these as instance fields, to be initialized in the render() meth
    // from the context provider

    const initialState = this.getInitialState(props);
    this.state = initialState;
  }

  getInitialState(props) {
    const ids = {
      title: uuid(),
      text: uuid(),
    };
    let { formData } = props;
    const blocksFieldname = getBlocksFieldname(formData);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(formData);

    if (!props.isEditForm) {
      // It's a normal (add form), get defaults from schema
      formData = {
        ...mapValues(props.schema.properties, 'default'),
        ...formData,
      };
    }
    // defaults for block editor; should be moved to schema on server side
    // Adding fallback in case the fields are empty, so we are sure that the edit form
    // shows at least the default blocks
    if (
      formData.hasOwnProperty(blocksFieldname) &&
      formData.hasOwnProperty(blocksLayoutFieldname)
    ) {
      if (
        !formData[blocksLayoutFieldname] ||
        isEmpty(formData[blocksLayoutFieldname].items)
      ) {
        formData[blocksLayoutFieldname] = {
          items: [ids.title, ids.text],
        };
      }
      if (!formData[blocksFieldname] || isEmpty(formData[blocksFieldname])) {
        formData[blocksFieldname] = {
          [ids.title]: {
            '@type': 'title',
          },
          [ids.text]: {
            '@type': settings.defaultBlockType,
          },
        };
      }
    }

    const state = {
      formData,
      initialFormData: { ...formData },
      errors: {},
      selected:
        formData.hasOwnProperty(blocksLayoutFieldname) &&
        formData[blocksLayoutFieldname].items.length > 0
          ? formData[blocksLayoutFieldname].items[0]
          : null,
      placeholderProps: {},
      isClient: false,
    };
    return state;
  }

  /**
   * Component did mount
   * @method componentDidMount
   * @returns {undefined}
   */
  componentDidMount() {
    this.setContextData({
      ...this.state,
      isClient: true,
    });
  }

  /**
   * Component did update
   * @method componentDidUpdate
   * @param {Object} prevProps Previous properties
   * @returns {undefined}
   */
  componentDidUpdate(prevProps) {
    if (this.props.formData?.['@id'] !== prevProps.formData?.['@id']) {
      const newState = this.getInitialState(this.props);
      this.setContextData(newState); // .then(() => this.setState(newState));;
    }
  }

  /**
   * Change field handler
   * Remove errors for changed field
   * @method onChangeField
   * @param {string} id Id of the field
   * @param {*} value Value of the field
   * @returns {undefined}
   */
  onChangeField(id, value) {
    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        // We need to catch also when the value equals false this fixes #888
        [id]: value || (value !== undefined && isBoolean(value)) ? value : null,
      },
    });
  }

  hideHandler = (data) => {
    return !!data.fixed || !blockHasValue(data);
  };

  /**
   * Change block handler
   * @method onChangeBlock
   * @param {string} id Id of the block
   * @param {*} value Value of the field
   * @returns {undefined}
   */
  onChangeBlock(id, value) {
    const blocksFieldname = getBlocksFieldname(this.contextData.formData);
    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        [blocksFieldname]: {
          ...this.contextData.formData[blocksFieldname],
          [id]: value || null,
        },
      },
    });
  }

  /**
   * Change block handler
   * @method onMutateBlock
   * @param {string} id Id of the block
   * @param {*} value Value of the field
   * @returns {undefined}
   */
  onMutateBlock(id, value) {
    const idTrailingBlock = uuid();
    const blocksFieldname = getBlocksFieldname(this.contextData.formData);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );
    const index =
      this.contextData.formData[blocksLayoutFieldname].items.indexOf(id) + 1;

    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        [blocksFieldname]: {
          ...this.contextData.formData[blocksFieldname],
          [id]: value || null,
          [idTrailingBlock]: {
            '@type': settings.defaultBlockType,
          },
        },
        [blocksLayoutFieldname]: {
          items: [
            ...this.contextData.formData[blocksLayoutFieldname].items.slice(
              0,
              index,
            ),
            idTrailingBlock,
            ...this.contextData.formData[blocksLayoutFieldname].items.slice(
              index,
            ),
          ],
        },
      },
    });
  }

  /**
   * Select block handler
   * @method onSelectBlock
   * @param {string} id Id of the field
   * @returns {undefined}
   */
  onSelectBlock(id) {
    return this.setContextData({
      selected: id,
    });
  }

  /**
   * Delete block handler
   * @method onDeleteBlock
   * @param {string} id Id of the field
   * @param {bool} selectPrev True if previous should be selected
   * @returns {undefined}
   */
  onDeleteBlock(id, selectPrev) {
    const blocksFieldname = getBlocksFieldname(this.contextData.formData);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );

    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        [blocksLayoutFieldname]: {
          items: without(
            this.contextData.formData[blocksLayoutFieldname].items,
            id,
          ),
        },
        [blocksFieldname]: omit(this.contextData.formData[blocksFieldname], [
          id,
        ]),
      },
      selected: selectPrev
        ? this.contextData.formData[blocksLayoutFieldname].items[
            this.contextData.formData[blocksLayoutFieldname].items.indexOf(id) -
              1
          ]
        : null,
    });
  }

  /**
   * Add block handler
   * @method onAddBlock
   * @param {string} type Type of the block
   * @param {Number} index Index where to add the block
   * @returns {string} Id of the block
   */
  onAddBlock(type, index) {
    const id = uuid();
    const idTrailingBlock = uuid();
    const blocksFieldname = getBlocksFieldname(this.contextData.formData);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );
    const totalItems = this.contextData.formData[blocksLayoutFieldname].items
      .length;
    const insert = index === -1 ? totalItems : index;

    return new Promise((resolve) => {
      this.setContextData({
        formData: {
          ...this.contextData.formData,
          [blocksLayoutFieldname]: {
            items: [
              ...this.contextData.formData[blocksLayoutFieldname].items.slice(
                0,
                insert,
              ),
              id,
              ...(type !== settings.defaultBlockType ? [idTrailingBlock] : []),
              ...this.contextData.formData[blocksLayoutFieldname].items.slice(
                insert,
              ),
            ],
          },
          [blocksFieldname]: {
            ...this.contextData.formData[blocksFieldname],
            [id]: {
              '@type': type,
            },
            ...(type !== settings.defaultBlockType && {
              [idTrailingBlock]: {
                '@type': settings.defaultBlockType,
              },
            }),
          },
        },
        selected: id,
      }).then(resolve(id));
    });
  }

  /**
   * Submit handler also validate form and collect errors
   * @method onSubmit
   * @param {Object} event Event object.
   * @returns {undefined}
   */
  onSubmit(event) {
    if (event) {
      event.preventDefault();
    }

    const errors = FormValidation.validateFieldsPerFieldset({
      schema: this.props.schema,
      formData: this.contextData.formData,
      formatMessage: this.props.intl.formatMessage,
    });

    if (keys(errors).length > 0) {
      const activeIndex = FormValidation.showFirstTabWithErrors({
        errors,
        schema: this.props.schema,
      });
      this.setContextData({
        errors,
        activeIndex,
      });
    } else {
      // Get only the values that have been modified (Edit forms), send all in case that
      // it's an add form
      if (this.props.isEditForm) {
        this.props.onSubmit(this.getOnlyFormModifiedValues());
      } else {
        this.props.onSubmit(this.contextData.formData);
      }
      if (this.props.resetAfterSubmit) {
        this.setContextData({
          formData: this.props.formData,
        });
      }
    }
  }

  /**
   * getOnlyFormModifiedValues handler
   * It returns only the values of the fields that are have really changed since the
   * form was loaded. Useful for edit forms and PATCH operations, when we only want to
   * send the changed data.
   * @method getOnlyFormModifiedValues
   * @param {Object} event Event object.
   * @returns {undefined}
   */
  getOnlyFormModifiedValues = () => {
    const fieldsModified = Object.keys(
      difference(this.contextData.formData, this.state.initialFormData),
    );

    return pickBy(this.contextData.formData, (value, key) =>
      fieldsModified.includes(key),
    );
  };

  /**
   * Move block handler
   * @method onMoveBlock
   * @param {number} dragIndex Drag index.
   * @param {number} hoverIndex Hover index.
   * @returns {undefined}
   */
  onMoveBlock(dragIndex, hoverIndex) {
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );

    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        [blocksLayoutFieldname]: {
          items: move(
            this.contextData.formData[blocksLayoutFieldname].items,
            dragIndex,
            hoverIndex,
          ),
        },
      },
    });
  }

  /**
   *
   * @method onFocusPreviousBlock
   * @param {string} currentBlock The id of the current block
   * @param {node} blockNode The id of the current block
   * @returns {undefined}
   */
  onFocusPreviousBlock(currentBlock, blockNode) {
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );
    const currentIndex = this.contextData.formData[
      blocksLayoutFieldname
    ].items.indexOf(currentBlock);

    if (currentIndex === 0) {
      // We are already at the top block don't do anything
      return;
    }
    const newindex = currentIndex - 1;
    blockNode.blur();

    return this.onSelectBlock(
      this.contextData.formData[blocksLayoutFieldname].items[newindex],
    );
  }

  /**
   *
   * @method onFocusNextBlock
   * @param {string} currentBlock The id of the current block
   * @param {node} blockNode The id of the current block
   * @returns {undefined}
   */
  onFocusNextBlock(currentBlock, blockNode) {
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );
    const currentIndex = this.contextData.formData[
      blocksLayoutFieldname
    ].items.indexOf(currentBlock);

    if (
      currentIndex ===
      this.contextData.formData[blocksLayoutFieldname].items.length - 1
    ) {
      // We are already at the bottom block don't do anything
      return new Promise((resolve) => {
        resolve();
      });
    }

    const newindex = currentIndex + 1;
    blockNode.blur();

    return this.onSelectBlock(
      this.contextData.formData[blocksLayoutFieldname].items[newindex],
    );
  }

  /**
   * handleKeyDown, sports a way to disable the listeners via an options named
   * parameter
   * @method handleKeyDown
   * @param {object} e Event
   * @param {number} index Block index
   * @param {string} block Block type
   * @param {node} node The block node
   * @returns {undefined}
   */
  handleKeyDown(
    e,
    index,
    block,
    node,
    {
      disableEnter = false,
      disableArrowUp = false,
      disableArrowDown = false,
    } = {},
  ) {
    if (e.key === 'ArrowUp' && !disableArrowUp) {
      this.onFocusPreviousBlock(block, node);
      e.preventDefault();
    }
    if (e.key === 'ArrowDown' && !disableArrowDown) {
      this.onFocusNextBlock(block, node);
      e.preventDefault();
    }
    if (e.key === 'Enter' && !disableEnter) {
      this.onAddBlock(settings.defaultBlockType, index + 1);
      e.preventDefault();
    }
  }

  /**
   * Removed blocks and blocks_layout fields from the form.
   * @method removeBlocksLayoutFields
   * @param {object} schema The schema definition of the form.
   * @returns A modified copy of the given schema.
   */
  removeBlocksLayoutFields = (schema) => {
    const newSchema = { ...schema };
    const layoutFieldsetIndex = findIndex(
      newSchema.fieldsets,
      (fieldset) => fieldset.id === 'layout',
    );
    if (layoutFieldsetIndex > -1) {
      const layoutFields = newSchema.fieldsets[layoutFieldsetIndex].fields;
      newSchema.fieldsets[layoutFieldsetIndex].fields = layoutFields.filter(
        (field) => field !== 'blocks' && field !== 'blocks_layout',
      );
      if (newSchema.fieldsets[layoutFieldsetIndex].fields.length === 0) {
        newSchema.fieldsets = [
          ...newSchema.fieldsets.slice(0, layoutFieldsetIndex),
          ...newSchema.fieldsets.slice(layoutFieldsetIndex + 1),
        ];
      }
    }
    return newSchema;
  };

  onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) {
      return;
    }
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      this.contextData.formData,
    );
    this.setState({
      placeholderProps: {},
    });
    return this.setContextData({
      formData: {
        ...this.contextData.formData,
        [blocksLayoutFieldname]: {
          items: move(
            this.contextData.formData[blocksLayoutFieldname].items,
            source.index,
            destination.index,
          ),
        },
      },
    });
  };

  handleDragStart = (event) => {
    const queryAttr = 'data-rbd-draggable-id';
    const domQuery = `[${queryAttr}='${event.draggableId}']`;
    const draggedDOM = document.querySelector(domQuery);

    if (!draggedDOM) {
      return;
    }

    const { clientHeight, clientWidth } = draggedDOM;
    const sourceIndex = event.source.index;
    var clientY =
      parseFloat(window.getComputedStyle(draggedDOM.parentNode).paddingTop) +
      [...draggedDOM.parentNode.children]
        .slice(0, sourceIndex)
        .reduce((total, curr) => {
          const style = curr.currentStyle || window.getComputedStyle(curr);
          const marginBottom = parseFloat(style.marginBottom);
          return total + curr.clientHeight + marginBottom;
        }, 0);

    this.setState({
      placeholderProps: {
        clientHeight,
        clientWidth,
        clientY,
        clientX: parseFloat(
          window.getComputedStyle(draggedDOM.parentNode).paddingLeft,
        ),
      },
    });
  };

  onDragUpdate = (update) => {
    if (!update.destination) {
      return;
    }
    const draggableId = update.draggableId;
    const destinationIndex = update.destination.index;

    const queryAttr = 'data-rbd-draggable-id';
    const domQuery = `[${queryAttr}='${draggableId}']`;
    const draggedDOM = document.querySelector(domQuery);

    if (!draggedDOM) {
      return;
    }
    const { clientHeight, clientWidth } = draggedDOM;
    const sourceIndex = update.source.index;
    const childrenArray = [...draggedDOM.parentNode.children];
    const movedItem = childrenArray[sourceIndex];
    childrenArray.splice(sourceIndex, 1);

    const updatedArray = [
      ...childrenArray.slice(0, destinationIndex),
      movedItem,
      ...childrenArray.slice(destinationIndex + 1),
    ];

    var clientY =
      parseFloat(window.getComputedStyle(draggedDOM.parentNode).paddingTop) +
      updatedArray.slice(0, destinationIndex).reduce((total, curr) => {
        const style = curr.currentStyle || window.getComputedStyle(curr);
        const marginBottom = parseFloat(style.marginBottom);
        return total + curr.clientHeight + marginBottom;
      }, 0);

    this.setState({
      placeholderProps: {
        clientHeight,
        clientWidth,
        clientY,
        clientX: parseFloat(
          window.getComputedStyle(draggedDOM.parentNode).paddingLeft,
        ),
      },
    });
  };

  get contextData() {
    return this.props.formStateContext?.contextData || this.state;
  }

  get setContextData() {
    return this.props.formStateContext?.setContextData || this.setState;
  }

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
  render() {
    const { schema: originalSchema, onCancel, onSubmit } = this.props;
    const { formData, placeholderProps } = this.contextData;
    const blocksFieldname = getBlocksFieldname(formData);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(formData);
    const renderBlocks = formData?.[blocksLayoutFieldname]?.items;
    const blocksDict = formData?.[blocksFieldname];
    const schema = this.removeBlocksLayoutFields(originalSchema);

    const contextData = this.contextData.isClient
      ? this.contextData
      : this.state;

    return this.props.visual ? (
      // Removing this from SSR is important, since react-beautiful-dnd supports SSR,
      // but draftJS don't like it much and the hydration gets messed up
      contextData.isClient && (
        <div className="ui container">
          <DragDropContext
            onDragEnd={this.onDragEnd}
            onDragStart={this.handleDragStart}
            onDragUpdate={this.onDragUpdate}
          >
            <Droppable droppableId="edit-form">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ position: 'relative' }}
                >
                  {map(renderBlocks, (block, index) => (
                    <Draggable draggableId={block} index={index} key={block}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`block-editor-${blocksDict[block]['@type']}`}
                        >
                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                visibility:
                                  contextData.selected === block &&
                                  !this.hideHandler(blocksDict[block])
                                    ? 'visible'
                                    : 'hidden',
                                display: 'inline-block',
                              }}
                              {...provided.dragHandleProps}
                              className="drag handle wrapper"
                            >
                              <Icon name={dragSVG} size="18px" />
                            </div>

                            <EditBlock
                              id={block}
                              index={index}
                              type={blocksDict[block]['@type']}
                              key={block}
                              handleKeyDown={this.handleKeyDown}
                              onAddBlock={this.onAddBlock}
                              onChangeBlock={this.onChangeBlock}
                              onMutateBlock={this.onMutateBlock}
                              onChangeField={this.onChangeField}
                              onDeleteBlock={this.onDeleteBlock}
                              onSelectBlock={this.onSelectBlock}
                              onMoveBlock={this.onMoveBlock}
                              onFocusPreviousBlock={this.onFocusPreviousBlock}
                              onFocusNextBlock={this.onFocusNextBlock}
                              properties={formData}
                              data={blocksDict[block]}
                              pathname={this.props.pathname}
                              block={block}
                              selected={contextData.selected === block}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {!isEmpty(placeholderProps) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${placeholderProps.clientY}px`,
                        height: `${placeholderProps.clientHeight + 18}px`,
                        background: '#eee',
                        width: `${placeholderProps.clientWidth}px`,
                        borderRadius: '3px',
                      }}
                    />
                  )}
                </div>
              )}
            </Droppable>
            {contextData.isClient && (
              <Portal
                node={__CLIENT__ && document.getElementById('sidebar-metadata')}
              >
                <UiForm
                  method="post"
                  onSubmit={this.onSubmit}
                  error={keys(contextData.errors).length > 0}
                >
                  {schema &&
                    map(schema.fieldsets, (item) => [
                      <Segment secondary attached key={item.title}>
                        {item.title}
                      </Segment>,
                      <Segment attached key={`fieldset-contents-${item.title}`}>
                        {map(item.fields, (field, index) => (
                          <Field
                            {...schema.properties[field]}
                            id={field}
                            formData={contextData.formData}
                            focus={false}
                            value={contextData.formData[field]}
                            required={schema.required.indexOf(field) !== -1}
                            onChange={this.onChangeField}
                            onBlur={this.onBlurField}
                            onClick={this.onClickInput}
                            dateOnly={
                              schema.properties[field].widget === 'date'
                            }
                            key={field}
                            error={contextData.errors[field]}
                          />
                        ))}
                      </Segment>,
                    ])}
                </UiForm>
              </Portal>
            )}
          </DragDropContext>
        </div>
      )
    ) : (
      <Container>
        <UiForm
          method="post"
          onSubmit={this.onSubmit}
          error={keys(contextData.errors).length > 0}
        >
          <Segment.Group raised>
            {schema && schema.fieldsets.length > 1 && (
              <Tab
                menu={{
                  secondary: true,
                  pointing: true,
                  attached: true,
                  tabular: true,
                  className: 'formtabs',
                }}
                panes={map(schema.fieldsets, (item) => ({
                  menuItem: item.title,
                  render: () => [
                    this.props.title && (
                      <Segment secondary attached key={this.props.title}>
                        {this.props.title}
                      </Segment>
                    ),
                    ...map(item.fields, (field, index) => (
                      <Field
                        {...schema.properties[field]}
                        id={field}
                        formData={contextData.formData}
                        fieldSet={item.title.toLowerCase()}
                        focus={index === 0}
                        value={contextData.formData[field]}
                        required={schema.required.indexOf(field) !== -1}
                        onChange={this.onChangeField}
                        key={field}
                        error={contextData.errors[field]}
                      />
                    )),
                  ],
                }))}
              />
            )}
            {schema && schema.fieldsets.length === 1 && (
              <Segment>
                {this.props.title && (
                  <Segment className="primary">{this.props.title}</Segment>
                )}
                {this.props.description && (
                  <Segment secondary>{this.props.description}</Segment>
                )}
                {keys(contextData.errors).length > 0 && (
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
                {map(schema.fieldsets[0].fields, (field) => (
                  <Field
                    {...schema.properties[field]}
                    id={field}
                    value={contextData.formData?.[field]}
                    required={schema.required.indexOf(field) !== -1}
                    onChange={this.onChangeField}
                    key={field}
                    error={contextData.errors[field]}
                  />
                ))}
              </Segment>
            )}
            {!this.props.hideActions && (
              <Segment className="actions" clearing>
                {onSubmit && (
                  <Button
                    basic
                    primary
                    floated="right"
                    type="submit"
                    aria-label={
                      this.props.submitLabel
                        ? this.props.submitLabel
                        : this.props.intl.formatMessage(messages.save)
                    }
                    title={
                      this.props.submitLabel
                        ? this.props.submitLabel
                        : this.props.intl.formatMessage(messages.save)
                    }
                    loading={this.props.loading}
                  >
                    <Icon className="circled" name={aheadSVG} size="30px" />
                  </Button>
                )}
                {onCancel && (
                  <Button
                    basic
                    secondary
                    aria-label={this.props.intl.formatMessage(messages.cancel)}
                    title={this.props.intl.formatMessage(messages.cancel)}
                    floated="right"
                    onClick={onCancel}
                  >
                    <Icon className="circled" name={clearSVG} size="30px" />
                  </Button>
                )}
              </Segment>
            )}
          </Segment.Group>
        </UiForm>
      </Container>
    );
  }
}

const WrappedForm = withFormStateContext(Form);
export default injectIntl(WrappedForm, { forwardRef: true });
