/**
 * @version 1.0.0
 */
// TODO: DataSource table as an extension of a basic table.
/**
 * DP Table
 *
 * @module DP.Table
 * @requires widget, substitute, classnamemanager
 * @namespace Y.DP
 */
var	Lang = Y.Lang,
        Node = Y.Node;

/**
 * Dynamic table class.
 *  
 * @class TableBase
 * @extends Y.Widget
 */
Y.namespace('DP').Table = Y.Base.create('dp-table-body', Y.Widget, [], {

        /**
         * Initializer, implemented for Y.Base
         * 
         * @method initializer
         * @param config {Object} Configuration object.
         */
        initializer : function(config) {

                Y.log('initializer', 'info', 'dp-table-body');

                // Node references
                this._tbodyNode = this.get('contentBox'); //config.tbodyNode;

                // IO
                this.publish('success', {defaultFn: this._defResponseSuccessFn});

                // Just after sendRequest()
                this.publish('loading', {defaultFn: this._defLoadingFn});

                // Single handler for IO Events
                this._ioHandlers = {
                        complete: Y.bind(this._handleResponse, this, 'complete'),
                        success: Y.bind(this._handleResponse, this, 'success'),
                        failure: Y.bind(this._handleResponse, this, 'failure'),
                        end: Y.bind(this._handleResponse, this, 'end')
                };
        },

        /**
         * Destructor, implemented for Y.Base
         * 
         * @method destructor
         */
        destructor : function() {
                // detach click, enter, leave
                this._tbodyNode.detach('click');
                this._tbodyNode.detach('mouseenter');
                this._tbodyNode.detach('mouseleave');

                this._tbodyNode = null;	
        },

        // Y.Widget Rendering Lifecycle

        /**
         * @see Widget.renderUI
         */
        renderUI : function() { 
                this.load(""); // Just load the dataset without any query parameters
        },

        /**
         * @see Widget.bindUI
         */
        bindUI : function() {

                this._tbodyNode.delegate('selectstart', function(e) {
                    e.preventDefault();
                }, 'tr', this);		

                // re-render rows after data change.
                this.after('dataChange', this._afterDataChange);
                this.after('loadingChange', this._afterLoadingChange);

                this.after('queryParametersChange', this._afterQueryParametersChange);
        },

        /**
         * @see Widget.syncUI
         */
        syncUI : function() {

        },

        // PROTECTED VARIABLES

        /**
         * Object used for IO callback. Contains four functions to handle each stage of the IO request.
         * 
         * @property _ioHandlers
         * @type Object
         */
        _ioHandlers: null,

        /**
         * Reference to the TBODY node containing this table data.
         * 
         * @property _tbodyNode
         * @type Node
         */
        _tbodyNode : null,


        // PROTECTED METHODS

        /**
         * Render the rows contained in the data attribute.
         * 
         * @method _renderTableRows
         * @protected
         */
        _renderTableRows : function() {


                var data = this.get('data'),
                    bodyNode = this._tbodyNode,
                    zebraClass;

                if (data.results.length > 0) {
                        bodyNode.setContent('');

                        for (var i=0; i < data.results.length; i++) {
                                zebraClass = (i % 2) ? 'row' : 'row-alt';

                                var trTemplate = Y.substitute(this.ROW_TEMPLATE, {
                                        trClassName: this.getClassName(zebraClass)
                                });
                                var tr = Node.create(trTemplate);

                                var cells = this.get('cells');

                                for (var x=0; x < cells.length; x++) {
                                        var cell = cells[x],
                                            field = cell.field,
                                            cellWidth = cell.width;

                                        var td = Node.create(Y.substitute(this.CELL_TEMPLATE, {
                                                tdClassName: this.getClassName('cell')
                                        }));

                                        // Use renderer if defined
                                        if (undefined === cell.renderer) {
                                                td.setContent(data.results[i][field]);
                                        } else {
                                                cell.renderer(data.results[i], field, td);
                                        }

                                        td.set('width', cellWidth);

                                        tr.append(td);
                                }

                                // Previously we created an array of nodes, and then appended them in one call.
                                // Apparently Node.append no longer supports arrays.
                                bodyNode.append(tr);
                        }
                } else {
                        bodyNode.setContent('');
                        bodyNode.append(Node.create(Y.substitute(this.ZEROROWS_TEMPLATE, {
                                colspan: this.get('cells').length,
                                message: this.get('strings.zerorows')
                        })));
                }
        },

        /**
         * Load data from the provided Y.DataSource Instance
         * 
         * @method load
         * @public
         */
        load : function(requestString) {

                var ds = this.get('dataSource');

                ds.sendRequest({
                        request : requestString,
                        callback : this._ioHandlers
                });	

                this.fire('loading', {id: this._io, request: requestString});
        },

        /**
         * Single interface for io responses, fires custom event at each stage of datasource request.
         * @method _handleResponse
         * @param type {String} Event type
         * @param e {Object} Response Object
         * @protected
         */
        _handleResponse : function (type, e) {
                this.fire(type, {id: this._io, response: e.response});
                this._io = null;
        },

        /**
         * Public handler for parameterchange events.
         * 
         * The subject supplies its list of parameters to us, which we then apply to our locally maintained list of parameters.
         * Our afterChange then applies those to a datasource request.
         * 
         * @method handleParameterChange
         * @public
         * @param e {Event} CustomEvent
         */
        handleParameterChange : function(e) {
                Y.log('handleParameterChange', 'info', 'dp-table-body');

                var params = this.get('queryParameters');
                params[e.type] = e.parameters;
                this.set('queryParameters', params);
        },

        /**
         * Default handler for table:success (DataSource.IO Response Success)
         * 
         * @method _defResponseSuccessFn
         * @param o {Object} Response object
         */
        _defResponseSuccessFn : function(o) {
                Y.log('_defResponseSuccessFn', 'info', 'dp-table-body');

                this.set('data', o.response);
                this.set('loading', false);
        },

        /**
         * Default handler for the loading event
         * 
         * @method _defLoadingFn
         * @param e {Event} Event
         */
        _defLoadingFn : function(e) {
                Y.log('_defLoadingFn', 'info', 'dp-table-body');

                this.set('loading', true);
        },

        /**
         * New data handler, causes table to re-render
         * 
         * @method _afterDataChange
         * @protected
         */
        _afterDataChange : function(e) {
                Y.log('_afterDataChange', 'info', 'dp-table-body');

                this._renderTableRows();
        },

        /**
         * Update widget ui to reflect loading state change.
         * 
         * @method _afterLoadingChange
         * @protected
         * @param e {Event} custom event
         */
        _afterLoadingChange : function(e) {
                var loading = this.get('loading');
                if (loading) {
                        Y.log('loading');
                } else {
                        Y.log('finished loading');
                }
        },

        /**
         * A change in query parameters will rebuild the request string and reload the datasource.
         * 
         * @method _afterQueryParametersChange
         * @protected
         */
        _afterQueryParametersChange : function() {
                Y.log('_afterQueryParametersChange');

                var params = this.get('queryParameters'),
                        requestHash = Array(),
                        source,
                        key;

                // Iterate through sources
                for (source in params) {
                        for (key in params[source]) {
                                if (params[source][key].length > 0) {
                                        requestHash.push(key + '=' + params[source][key]);
                                }
                        }
                }

                var requestString = "?" + requestHash.join("&");
                Y.log(requestString);

                this.load(requestString);
        },

        /**
         * Body section does not require a contentBox because the content is bounded by the TBODY node.
         * 
         * @property CONTENT_TEMPLATE
         * @type String
         */
        CONTENT_TEMPLATE : null,

        /**
         * Row template for a status message, that spans the entire table.
         * 
         * @property ZEROROWS_TEMPLATE
         * @type String
         */
        ZEROROWS_TEMPLATE : '<tr><td colspan="{colspan}">{message}</td></tr>',

        /**
         * Standard row template.
         * 
         * @property ROW_TEMPLATE
         * @type String
         */
        ROW_TEMPLATE : '<tr class="{trClassName}"></tr>',

        /**
         * Standard cell template.
         * 
         * @property CELL_TEMPLATE
         * @type String
         */
        CELL_TEMPLATE : '<td class="{tdClassName}"></td>'
},{
        // static

        /**
         * Static property provides a string to identify the class.
         * <p>
         * Currently used to apply class identifiers to the bounding box 
         * and to classify events fired by the widget.
         * </p>
         *
         * @property Widget.NAME
         * @type String
         * @static
         */
        NAME : "dp-table-body",

        /**
         * Static property used to define the default attribute 
         * configuration for the Widget.
         * 
         * @property Widget.ATTRS
         * @type Object
         * @static
         */
        ATTRS : {

                // TODO: fix overflow when height is set via constructor.

                strings : {
                        value : {
                            loading : "Loading...",
                            zerorows : "No results available"
                        }
                },

                /**
                 * Array of cells to render. 
                 * Does not necessarily have a 1:1 relationship with DataSource fields.
                 * 
                 * cells are specified in the format { field: "fieldname", renderer: fnCellRenderer }
                 */
                cells : {
                        value: Array()
                },

                /**
                 * Active Y.DataSource instance, used to populate the 
                 * 
                 * @attribute dataSource
                 * @default null
                 * @type Y.DataSource
                 */
                dataSource : { 
                        value: null 
                },

                /**
                 * The most recent set of results returned by the datasource.
                 * 
                 * @attribute data
                 * @default null
                 * @type Array
                 */
                data : {
                        value: null
                },

                /**
                 * Whether the table is loading new data or not.
                 * 
                 * @attribute loading
                 * @default false
                 * @type Boolean
                 */
                loading : {
                        value: false,
                        validator: Lang.isBoolean
                },

                /**
                 * Array of params
                 * A change in parameters causes a table reload.
                 * 
                 * @attribute queryParameters
                 * @default Empty array
                 * @type Array
                 */
                queryParameters : {
                        value: Array(),
                        validator: Lang.isArray
                }
        },

        HTML_PARSER : {
                tbodyNode : '.yui3-dp-table-body'
        }
});