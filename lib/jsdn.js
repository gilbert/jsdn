(function() {
  var ConnectionView, JsdnObject, ObjectView, PrimitiveView, Property, PropertyView, ScopeView, VarNameView;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  _.templateSettings.interpolate = /\{\{(.+?)\}\}/g;
  _.mixin({
    getTemplate: function(name) {
      return _.template($('#templates .' + name).html());
    }
  });
  ConnectionView = (function() {
    __extends(ConnectionView, Backbone.View);
    function ConnectionView() {
      ConnectionView.__super__.constructor.apply(this, arguments);
    }
    ConnectionView.prototype.initialize = function(options) {
      this.scope = options.scope;
      ConnectionView.__super__.initialize.apply(this, arguments);
      this.line = this.scope.svg.path().attr({
        stroke: "#222",
        fill: "none"
      });
      this.el = this.line.node;
      this.from_node = options.from;
      this.to_node = options.to;
      return this.render();
    };
    ConnectionView.prototype.remove = function() {
      if (this.scope.svg && this.line) {
        this.line.remove();
        delete this.line;
      }
      return true;
    };
    ConnectionView.prototype.render = function() {
      if (this.scope.svg && this.line && this.line.attrs) {
        this.line.attr({
          path: this.getPath(),
          'arrow-end': 'classic-wide-long',
          'stroke-width': 1.5,
          'stroke': '#333'
        });
      }
      return this;
    };
    ConnectionView.prototype.getNodePosition = function(node, type) {
      var o1;
      o1 = node.$el.offset();
      if (node.constructor === VarNameView) {
        o1.top += parseInt(node.$el.outerHeight() / 2, 10) + 2;
        o1.left += 4;
      } else if (!node.$el.hasClass('object')) {
        o1.top += parseInt(node.$el.outerHeight() / 2, 10);
      }
      if (type === 'from') {
        o1.left += node.$el.width();
      }
      return o1;
    };
    ConnectionView.prototype.getPath = function() {
      var diffx, diffy, f1, f2, min_diff, offset, ofx, ofy, x1, x2, x3, x4, y1, y2, y3, y4;
      f1 = this.getNodePosition(this.from_node, 'from');
      f2 = this.getNodePosition(this.to_node, 'to');
      offset = this.scope.$el.offset();
      ofx = this.scope.$el.scrollLeft() - offset.left;
      ofy = this.scope.$el.scrollTop() - offset.top;
      x1 = f1.left + ofx;
      y1 = f1.top + ofy;
      x4 = f2.left + ofx;
      y4 = f2.top + ofy;
      min_diff = 42;
      diffx = Math.max(min_diff, x4 - x1);
      diffy = Math.max(min_diff, y4 - y1);
      x2 = x1 + diffx * 0.5;
      y2 = y1;
      x3 = x4 - diffx * 0.5;
      y3 = y4;
      return ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
    };
    return ConnectionView;
  })();
  Property = Backbone.Model.extend({});
  JsdnObject = Backbone.Collection.extend({
    model: Property,
    initialize: function(models, options) {
      var func, innerObject, name, value, _ref, _results;
      this.parent = options.parent;
      this.call = options.call;
      _ref = options.attrs;
      _results = [];
      for (name in _ref) {
        value = _ref[name];
        _results.push(typeof value === 'function' ? (func = new JsdnObject(null, {
          attrs: {},
          parent: this,
          call: value
        }), this.add({
          name: name,
          value: func
        })) : typeof value === 'object' ? (innerObject = new JsdnObject(null, {
          attrs: value,
          parent: this
        }), this.add({
          name: name,
          value: innerObject
        })) : this.add({
          name: name,
          value: value
        }));
      }
      return _results;
    }
  });
  PrimitiveView = Backbone.View.extend({
    className: 'value',
    initialize: function(options) {
      this.scope = options.scope;
      this.$el.draggable({
        containment: this.scope.el,
        drag: __bind(function() {
          return this.trigger('move');
        }, this),
        stop: __bind(function() {
          return this.trigger('move');
        }, this)
      });
      this.$el.css({
        position: 'absolute'
      });
      return this.$el.addClass(typeof this.model.get('value'));
    },
    render: function() {
      this.model.to_node = this;
      this.$el.html(this.model.get('value'));
      return this;
    },
    reposition: function($propertyEl, options) {
      var $parentObj, offset, targetPos;
      if (options == null) {
        options = {};
      }
      if (options.parentPos) {
        $parentObj = $propertyEl;
        targetPos = options.parentPos;
      } else {
        $parentObj = $propertyEl.closest('.object');
        targetPos = $parentObj.position();
      }
      offset = {
        left: $propertyEl.outerWidth() + 40,
        top: $propertyEl.index() * $propertyEl.outerHeight() + 3
      };
      targetPos.left += offset.left;
      targetPos.top += offset.top;
      if (options.animate && options.follow) {
        return this.$el.animate(targetPos, {
          duration: 120,
          easing: 'easeOutBack',
          step: __bind(function(now, fx) {
            var pos;
            this.trigger('move');
            pos = $parentObj.position();
            return fx.end = pos[fx.prop] + offset[fx.prop];
          }, this),
          complete: __bind(function() {
            return this.trigger('move');
          }, this)
        });
      } else if (options.animate) {
        return this.$el.animate(targetPos, {
          duration: 120,
          easing: 'easeOutBack',
          progress: __bind(function() {
            return this.trigger('move');
          }, this)
        });
      } else {
        return this.$el.css(targetPos);
      }
    }
  });
  PropertyView = Backbone.View.extend({
    className: 'property',
    template: _.getTemplate('jsdn-property'),
    initialize: function(options) {
      return this.scope = options.scope;
    },
    renderConnection: function() {
      return this.connView.render();
    },
    render: function() {
      var _ref, _ref2;
      if ((_ref = this.valueView) != null) {
        _ref.remove();
      }
      if ((_ref2 = this.connView) != null) {
        _ref2.remove();
      }
      this.$el.html(this.template(this.model.toJSON()));
      if (this.model.get('value').constructor === JsdnObject) {
        this.valueView = new ObjectView({
          collection: this.model.get('value'),
          scope: this.scope
        });
      } else {
        this.valueView = new PrimitiveView({
          model: this.model,
          scope: this.scope
        });
      }
      this.listenTo(this.valueView, 'move', __bind(function() {
        return this.renderConnection();
      }, this));
      this.listenTo(this.scope, 'move', __bind(function() {
        return this.renderConnection();
      }, this));
      this.scope.trigger('new-val', this.valueView);
      this.connView = new ConnectionView({
        from: this,
        to: this.valueView,
        scope: this.scope
      });
      $('svg', this.scope.graph).append(this.connView.render().el);
      return this;
    },
    repositionValue: function(options) {
      if (options == null) {
        options = {};
      }
      this.valueView.reposition(this.$el, options);
      return this.connView.render();
    }
  });
  VarNameView = PropertyView.extend({
    className: 'var-name',
    template: _.getTemplate('jsdn-var-name'),
    events: {
      'dblclick': 'repositionValueAnimate'
    },
    initialize: function(options) {
      this.scope = options.scope;
      this.value = options.value;
      this.$el.draggable({
        containment: this.scope.el,
        drag: __bind(function() {
          return this.renderConnection();
        }, this),
        stop: __bind(function() {
          return this.renderConnection();
        }, this)
      });
      return this.$el.css({
        position: 'absolute'
      });
    },
    repositionValueAnimate: function(e) {
      return this.repositionValue({
        animate: true,
        parentPos: this.$el.position()
      });
    }
  });
  ObjectView = Backbone.View.extend({
    className: 'object',
    templates: {
      object: _.getTemplate('jsdn-object'),
      func: _.getTemplate('jsdn-function')
    },
    events: {
      'dblclick': 'repositionAnimate'
    },
    initialize: function(options) {
      this.scope = options.scope;
      this.$el.draggable({
        containment: this.scope.el,
        drag: __bind(function() {
          this.trigger('move');
          return this.renderConnections();
        }, this),
        stop: __bind(function() {
          return this.trigger('move');
        }, this)
      });
      this.$el.css({
        position: 'absolute'
      });
      this.propViews = {};
      return this.type = this.collection.call ? 'function' : 'object';
    },
    addProperty: function(prop) {
      var view;
      view = this.propViews[prop.cid] = new PropertyView({
        model: prop,
        scope: this.scope
      });
      return this.$('.properties').append(view.render().el);
    },
    renderConnections: function() {
      var cid, view, _ref, _results;
      _ref = this.propViews;
      _results = [];
      for (cid in _ref) {
        view = _ref[cid];
        _results.push(view.renderConnection());
      }
      return _results;
    },
    render: function(pos) {
      var cid, def, view, _ref, _ref2;
      _ref = this.propViews;
      for (cid in _ref) {
        view = _ref[cid];
        view.remove();
      }
      if ((_ref2 = this.parentConn) != null) {
        _ref2.remove();
      }
      if (this.type === 'function') {
        def = this.collection.call.toString().match(/function ?\([^\)]*\)/);
        this.$el.html(this.templates.func({
          def: def
        }));
      } else {
        this.$el.html(this.templates.object());
      }
      if (pos != null) {
        this.$el.css(pos);
      }
      this.collection.each(this.addProperty, this);
      return this;
    },
    repositionValues: function(options) {
      var cid, view, _ref, _results;
      _ref = this.propViews;
      _results = [];
      for (cid in _ref) {
        view = _ref[cid];
        _results.push(view.repositionValue(options));
      }
      return _results;
    },
    reposition: function($propertyEl, options) {
      var pos;
      if (options == null) {
        options = {};
      }
      if (options.parentPos) {
        pos = options.parentPos;
        pos.top += $propertyEl.outerHeight();
        delete options.parentPos;
      } else {
        pos = $propertyEl.closest('.object').position();
        pos.top += $propertyEl.index() * $propertyEl.outerHeight() + 30;
      }
      pos.left += $propertyEl.outerWidth() + 40;
      if (options.animate) {
        this.$el.animate(pos, {
          duration: 100,
          easing: 'easeOutExpo',
          progress: __bind(function() {
            var cid, view, _ref, _results;
            this.trigger('move');
            _ref = this.propViews;
            _results = [];
            for (cid in _ref) {
              view = _ref[cid];
              _results.push(view.connView.render());
            }
            return _results;
          }, this)
        });
        return this.repositionValues(_.extend(options, {
          follow: true
        }));
      } else {
        this.$el.css(pos);
        return this.repositionValues(options);
      }
    },
    repositionAnimate: function() {
      return this.repositionValues({
        animate: true
      });
    }
  });
  ScopeView = Backbone.View.extend({
    className: 'scope',
    initialize: function(options) {
      var func, name, obj, value, _ref;
      this.isRoot = options.root;
      this.vars = options.vars;
      this.width = options.width;
      this.height = options.height;
      _ref = this.vars;
      for (name in _ref) {
        value = _ref[name];
        if (typeof value === 'function') {
          func = new JsdnObject(null, {
            attrs: {},
            call: value
          });
          this.vars[name] = new Property({
            name: name,
            value: func,
            scope: this
          });
        } else if (typeof value === 'object') {
          obj = new JsdnObject(null, {
            attrs: value
          });
          this.vars[name] = new Property({
            name: name,
            value: obj,
            scope: this
          });
        } else {
          this.vars[name] = new Property({
            name: name,
            value: value,
            scope: this
          });
        }
      }
      this.graph = $('<div class="graph" />').appendTo(this.el);
      this.svg = Raphael(this.graph[0], this.width, this.height);
      this.svg.path("M0 -20 L0 -20").attr({
        stroke: "#222",
        'stroke-dasharray': "-",
        fill: "none",
        opacity: 0
      });
      this.on('new-val', __bind(function(view) {
        return this.$el.append(view.render().el);
      }, this));
      return this.childViews = [];
    },
    addLocalVariable: function(name, value) {
      var view;
      view = this.childViews[value.cid] = new VarNameView({
        model: value,
        scope: this
      });
      return this.$el.append(view.render().el);
    },
    createInnerScope: function(locals) {
      var newScope;
      newScope = new ScopeView({
        vars: locals,
        width: 300,
        height: 200
      });
      this.$el.append(newScope.el);
      newScope.$el.draggable({
        containment: this.el,
        drag: function() {
          return newScope.trigger('move');
        },
        stop: function() {
          return newScope.trigger('move');
        }
      });
      return newScope.render();
    },
    render: function() {
      var cid, name, value, view, _ref, _ref2, _results;
      _ref = this.propViews;
      for (cid in _ref) {
        view = _ref[cid];
        view.remove();
      }
      _ref2 = this.vars;
      _results = [];
      for (name in _ref2) {
        value = _ref2[name];
        _results.push(this.addLocalVariable(name, value));
      }
      return _results;
    }
  });
  window.JSDN = {
    graph: function(variables) {
      this.scope = new ScopeView({
        root: true,
        vars: variables,
        el: '#jsdn-diagram',
        width: 1000,
        height: 400
      });
      this.scope.render();
      return this;
    }
  };
}).call(this);
