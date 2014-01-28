_.templateSettings.interpolate = /\{\{(.+?)\}\}/g
_.mixin
  getTemplate: (name) -> _.template $('#templates .' + name).html()

# ConectionView original taken from https://github.com/idflood/ThreeNodes.js
class ConnectionView extends Backbone.View
  initialize: (options) ->
    @app = options.app
    super
    @container = $("#graph")
    @line = @app.svg.path().attr
      stroke: "#222"
      fill: "none"
    # set the dom element
    @el = @line.node
    @from_node = options.from
    @to_node = options.to
    @render()

  remove: () ->
    if @app.svg && @line
      @line.remove()
      delete @line
    return true

  render: () ->
    if @app.svg && @line && @line.attrs
      @line.attr
        path: @getPath()
        'arrow-end': 'classic-wide-long'
        'stroke-width': 1.5
        'stroke': '#333'
    @

  getNodePosition: (node, type) ->
    o1 = node.$el.offset()
    if node.constructor == VarNameView
      o1.top += parseInt(node.$el.outerHeight() / 2, 10) + 2
      o1.left += 4
    else if not node.$el.hasClass('object')
      o1.top += parseInt(node.$el.outerHeight() / 2, 10)

    if type == 'from'
      o1.left += node.$el.width()
    return o1

  getPath: () ->
    f1 = @getNodePosition(@from_node, 'from')
    f2 = @getNodePosition(@to_node, 'to')

    offset = $('#jsdn-diagram').offset()
    ofx = $('#jsdn-diagram').scrollLeft() - offset.left
    ofy = $('#jsdn-diagram').scrollTop() - offset.top
    x1 = f1.left + ofx
    y1 = f1.top + ofy
    x4 = f2.left + ofx
    y4 = f2.top + ofy
    min_diff = 42
    diffx = Math.max(min_diff, x4 - x1)
    diffy = Math.max(min_diff, y4 - y1)

    x2 = x1 + diffx * 0.5
    y2 = y1
    x3 = x4 - diffx * 0.5
    y3 = y4

    ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",")


Property = Backbone.Model.extend({})

JsdnObject = Backbone.Collection.extend
  model: Property
  initialize: (models, options) ->
    @parent = options.parent
    @call = options.call

    for name, value of options.attrs
      if typeof value == 'function'
        func = new JsdnObject(null, { attrs: {}, parent: this, call: value })
        this.add(name: name, value: func)
      else if typeof value == 'object'
        innerObject = new JsdnObject(null, { attrs: value, parent: this })
        this.add(name: name, value: innerObject)
      else
        this.add({ name, value })

PrimitiveView = Backbone.View.extend
  className: 'value'
  initialize: (options) ->
    @scope = options.scope
    @$el.draggable
      containment: @scope.el
      drag: => this.trigger('move')
      stop: => this.trigger('move')
    @$el.css(position: 'absolute') # why does it relative
    @$el.addClass(typeof @model.get('value'))
  render: ->
    @model.to_node = this
    @$el.html @model.get('value')
    @
  reposition: ($propertyEl, options={}) ->
    # Initialize value next to self
    if options.parentPos
      $parentObj = $propertyEl
      targetPos = options.parentPos
    else
      $parentObj = $propertyEl.closest('.object')
      targetPos = $parentObj.position()

    # cache offset for fastness
    offset =
      left: $propertyEl.outerWidth() + 40
      top: $propertyEl.index() * $propertyEl.outerHeight() + 3
    targetPos.left += offset.left
    targetPos.top += offset.top

    if options.animate && options.follow
      @$el.animate targetPos,
        duration: 120
        easing: 'easeOutBack'
        step: (now, fx) =>
          this.trigger('move')
          pos = $parentObj.position()
          fx.end = pos[fx.prop] + offset[fx.prop]
        complete: => this.trigger('move')
    else if options.animate
      @$el.animate targetPos, duration: 120, easing: 'easeOutBack', progress: => this.trigger('move')
    else
      @$el.css(targetPos)

PropertyView = Backbone.View.extend
  className: 'property'
  template: _.getTemplate 'jsdn-property'

  initialize: (options) ->
    @app = options.app
    @scope = options.scope

  renderConnection: ->
    @connView.render()

  render: ->
    @valueView?.remove()
    @connView?.remove()

    # Render self
    @$el.html this.template @model.toJSON()

    # Create & render value
    if @model.get('value').constructor == JsdnObject
      # Value is an object
      @valueView = new ObjectView(collection: @model.get('value'), app: @app, scope: @scope)
    else
      # Value is a primitive (string, integer)
      @valueView = new PrimitiveView(model: @model, app: @app, scope: @scope)

    this.listenTo @valueView, 'move', () => this.renderConnection()
    @scope.trigger 'jsdn:new-val', @valueView

    # Create & render connection
    @connView = new ConnectionView(from: this, to: @valueView, app: @app)
    $('#graph svg').append @connView.render().el
    @

  repositionValue: (options={}) ->
    # Initialize value view next to self
    @valueView.reposition(this.$el, options)
    @connView.render()

VarNameView = PropertyView.extend
  className: 'var-name'
  template: _.getTemplate 'jsdn-var-name'
  events:
    'dblclick': 'repositionValueAnimate'

  initialize: (options) ->
    @app = options.app
    @scope = options.scope
    @value = options.value
    @$el.draggable
      containment: @scope.el
      drag: => this.renderConnection()
      stop: => this.renderConnection()
    @$el.css(position: 'absolute') # why does it relative

  repositionValueAnimate: (e) ->
    this.repositionValue(animate: true, parentPos: @$el.position())

ObjectView = Backbone.View.extend
  className: 'object'
  templates:
    object: _.getTemplate 'jsdn-object'
    func: _.getTemplate 'jsdn-function'
  events:
    'dblclick': 'repositionAnimate'

  initialize: (options) ->
    @app = options.app
    @scope = options.scope
    @$el.draggable
      containment: @scope.el
      drag: =>
        this.trigger('move')
        this.renderConnections()
      stop: => this.trigger('move')
    @$el.css(position: 'absolute') # why does it relative

    @propViews = {}
    @type = if @collection.call then 'function' else 'object'

  addProperty: (prop) ->
    view = @propViews[prop.cid] = new PropertyView(model: prop, app: @app, scope: @scope)
    @$('.properties').append  view.render().el

  renderConnections: ->
    view.renderConnection() for cid, view of @propViews

  render: (pos) ->
    view.remove() for cid, view of @propViews
    @parentConn?.remove()

    # Render self
    if @type == 'function'
      def = @collection.call.toString().match(/function ?\([^\)]*\)/)
      @$el.html this.templates.func({ def })
    else
      @$el.html this.templates.object()

    @$el.css(pos) if pos?
    # Render properties
    @collection.each(@addProperty, this)
    @

  repositionValues: (options) ->
    view.repositionValue(options) for cid, view of @propViews

  reposition: ($propertyEl, options={}) ->
    # Initialize value next to self
    if options.parentPos
      pos = options.parentPos
      pos.top += $propertyEl.outerHeight()
      # Delete so it doesn't leak into nested reposition calls
      delete options.parentPos
    else
      pos = $propertyEl.closest('.object').position()
      pos.top += $propertyEl.index() * $propertyEl.outerHeight() + 30

    pos.left += $propertyEl.outerWidth() + 40

    if options.animate
      @$el.animate pos,
        duration: 100
        easing: 'easeOutExpo'
        progress: =>
          this.trigger('move')
          view.connView.render() for cid, view of @propViews

      this.repositionValues _.extend(options, follow: true)
    else
      @$el.css(pos)
      this.repositionValues(options)

  repositionAnimate: -> this.repositionValues(animate: true)


ScopeView = Backbone.View.extend

  initialize: (options) ->
    return unless @el
    @app = options.app
    @vars = options.vars

    # Compile objects
    for name, value of @vars
      if typeof value == 'function'
        func = new JsdnObject(null, { attrs: {}, call: value })
        @vars[name] = new Property({ name: name, value: func, scope: this })
      else if typeof value == 'object'
        obj = new JsdnObject(null, { attrs: value })
        @vars[name] = new Property({ name: name, value: obj, scope: this })
      else
        @vars[name] = new Property({ name, value, scope: this })

    if options.root == true
      # Set up SVG for drawing line connections
      @app.svg = Raphael("graph", 1000, 400)
      line = @app.svg.path("M0 -20 L0 -20").attr
        stroke: "#222"
        'stroke-dasharray': "-"
        fill: "none"
        opacity: 0
      this.on 'jsdn:new-val', (view) => @$el.append(view.render().el)

    # Store child views for cleanup
    @childViews = []

  addLocalVariable: (name, value) ->
    view = @childViews[value.cid] = new VarNameView(model: value, app: @app, scope: this)
    @$el.append  view.render().el

  render: ->
    view.remove() for cid, view of @propViews
    this.addLocalVariable(name, value) for name, value of @vars

    # object = new JsdnObject(null, { attrs: rootObject })
    # window.objectView = new ObjectView(collection: object, app: @app, pos: { x: 20, y: 20 })
    # @$el.append(objectView.render({ top: 20, left: 20 }).el)
    # objectView.repositionValues()

window.JSDN =
  graph: (variables) ->
    this.pubsub = _.extend({}, Backbone.Events)

    this.jsdnView = new ScopeView
      root: true
      app: this
      vars: variables
      el: '#jsdn-diagram'
    this.jsdnView.render()
