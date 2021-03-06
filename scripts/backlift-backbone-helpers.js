//  backlift-backbone-helpers.js
//  (c) 2012 Cole Krumbholz, SendSpree Inc.
//
//  This document may be used and distributed in accordance with 
//  the MIT license. You may obtain a copy of the license at 
//    http://www.opensource.org/licenses/mit-license.php

(function(){

  // Backlift namespace
  var Backlift = this.Backlift;
  if (typeof Backlift === 'undefined') {
    Backlift = this.Backlift = {};
  }

  // Backlift.handleFormErrors:
  // Will automatically display errors on your forms if you use the following
  // conventions:
  //
  // - Each form input should have a parent tag with an id that matches the 
  //   input's name attribute. (the 'group tag')
  // - Each group tag should have a child of the class 'errors'. This is where
  //   that input field's errors will be listed. It should be empty.
  // - A sibling of the group tags should have the id 'form_errors'. This is
  //   where general form errors will be listed. It should be empty.
  //
  // Here is an example:
  //
  //   <form>
  //     <div id="myfield">                               <!-- // group tag -->
  //       <label>myfield <span class="errors"></span>    <!-- // errors    -->
  //       <input name="myfield" type="text"></label>
  //     </div>
  //     <div id="form_errors"></div>                     <!-- // form errs -->
  //     <input type="submit">
  //   </form>
  // 
  // Arguments:
  //   view: the Backbone.js View object that contains the form.
  //   data: an object returned by backlift containing form errors. Typically
  //     this is provided by an error event.
  //   prefix: (optional) a prefix that will modify jquery searches for the 
  //     group tags and 'form_errors' tag. For example, passing 'my' as the 
  //     prefix to a form with a 'message' field will modify elements that 
  //     match '#my_message .errors' and '#my_form_errors'
  // 
  // Backlift.handleFormErrors should be called in response to an 'error' 
  // event. For example, in a Backbone view's initialization, you could use the 
  // following statement:
  // 
  //   this.model.on('error', function(model, response, params) {
  //     Backlift.handleFormErrors(this, response);
  //   }, this);

  Backlift.handleFormErrors = function (view, response, prefix) 
  {
    if (typeof prefix === 'string') {
      prefix += "_";
    } else {
      prefix = "";
    }

    var data = jQuery.parseJSON(response.responseText);

    if (data && 'form_errors' in data) {
      for (key in data.form_errors) {
        var tag;
        if (key == '') {
          tag = "#"+prefix+"form_errors";
        } else {
          tag = "#"+prefix+key+" .errors";
          view.$("#"+prefix+key).addClass('error')
        }
        for (error in data.form_errors[key]) {
          view.$(tag).append(data.form_errors[key][error]+" ");
        }
      }
    }       
  };


  // Backlift.cleanupFormErrors:
  // Cleans up form errors generated by handleFormErrors.

  Backlift.cleanupFormErrors = function (view, prefix) 
  {
    var selector = "*";
    if (typeof prefix === 'string') {
      prefix += "_";      
      selector = '[id^="'+prefix+'"]';
    } else {
      prefix = "";
    }

    view.$(selector).removeClass('error');
    view.$(selector+' .errors').empty();
    view.$('#'+prefix+'form_errors').empty();    
  };


  // Backlift.LoginView:
  // A Backbone view that pops-up a modal dialog box. Requires twitter 
  // bootstrap. The constructor takes one parameter, a create_user function:
  // 
  //   create_user: a function that takes one parameter, the user data received 
  //   from the server. The data should be used to create a backbone model 
  //   instance. 
  //
  // After initialization, call fetchUser().
  //
  // Note: The user model's url attribute should be set to 
  // '/backlift/auth/currentuser'. That way you can store custom user data on 
  // the backlift server just by calling save(your_data) on the fetched user 
  // model.
  //
  // Example:
  //
  //   App.UserModel = Backbone.Model.extend({
  //     url: '/backlift/auth/currentuser'
  //   });
  //
  //   var makeUser = function(data) {
  //     App.user = App.UserModel(data);
  //   };
  //
  //   var loginView = new Backlift.LoginView(makeUser);
  //   loginView.fetchUser();

  Backlift.LoginView = Backbone.View.extend({

    login_form: ""
    + "<div class='modal hide fade' id='login_modal'>"
    + "  <div class='modal-header'>"
    + "    <h3 style='margin-left: 10px'>Please Sign-in</h3>"
    + "  </div>"
    + "  <div class='modal-body'>"
    + "    <div class='row'><div class='span3' style='margin-left: 30px'>"
    + "      <form class='form' style='margin:0' id='login_form' action='' method='POST'>"
    + "      <div id='login_form_errors' style='color:red'></div>"

    + "      <div class='control-group' id='login_username'>"
    + "        <label class='control-label'>username  <span class='errors'></span>"
    + "        <input type='text' name='username'/></label>"
    + "      </div>"

    + "      <div class='control-group' id='login_password'>"
    + "        <label class='control-label'>password <span class='errors'></span>"
    + "        <input type='password' name='password'/></label>"
    + "      </div>"

    + "      <input type='submit' style='margin-top:18px' id='login-submit' class='btn btn-primary'>"
    + "      </form>"
    + "    </div></div>"
    + "  </div>"
    + "</div>",

    initialize: function(create_user) {
      this.create_user = create_user;
      $('body').append(this.render().el);
    },

    render: function() {
      $(this.el).html(this.login_form);
      return this;
    },

    _make_success_fn: function () {
      var that=this;
      return function (data, textStatus, jqXHR) {
        that._hide();
        that.create_user.call(undefined, data, jqXHR);
      }
    },

    _make_error_fn: function (prefix) {
      var that=this;
      return function(jqXHR, textStatus, errorThrown) {
        Backlift.handleFormErrors(that, jqXHR, prefix);
      }
    },

    events: {
      "click #forgot-link" : "_forgot_clicked",
      "click #forgot-submit" : "_forgot_submitted",
      "click #login-submit" : "_login_submitted",
    },

    _forgot_submitted: function () {
      var that = this;
      Backlift.cleanupFormErrors(this, "forgot");
      Backlift.cleanupFormErrors(this, "login");
      var that = this;
      $.ajax({
        type: 'POST',
        url: '/backlift/auth/password/forgot',
        data: $('#forgot_form').serialize(),
        error: this._make_error_fn("forgot"),
        success: function () {
          that.$('#forgot-submit').addClass('disabled');
          that.$el.undelegate('#forgot-submit', 'click');
          that.$('#recover-ok').fadeIn();          
        }
      });
      return false;
    },

    _login_submitted: function () {
      var that = this;
      Backlift.cleanupFormErrors(this, "forgot");
      Backlift.cleanupFormErrors(this, "login");
      $.ajax({
        type: 'POST',
        url: '/backlift/auth/login',
        data: $('#login_form').serialize(),
        success: this._make_success_fn(),
        error: this._make_error_fn("login"),
      });
      return false;
    },

    _forgot_clicked: function () {
      this.$("#forgotten-password").show();
    },

    _show: function() {
      $('#login_modal').modal({
        keyboard: false,
        backdrop: 'static',
        show: true
      });
    },

    _hide: function() {
      $('#login_modal').modal('hide');
    },

    fetchUser: function() {
      if ($.cookie('backlift_session')) {
        $.ajax({
          type: 'GET',
          url: '/backlift/auth/currentuser',
          success: this._make_success_fn(),
          error: this._show,
        });
      } else {
        this._show();
      }
    },

  });


  Backlift.LoginRegisterView = Backlift.LoginView.extend({

    login_form: ""
    + "<div class='modal hide fade' id='login_modal'>"
    + "  <div class='modal-header'>"
    + "    <h3 style='margin-left: 10px'>Please Sign-in</h3>"
    + "  </div>"
    + "  <div class='modal-body'><div class='row'>"
    + "    <div class='span3' style='margin-left: 30px'>"
    + "      <h4 style='margin-bottom: 10px'>Use existing account</h4>"
    + "      <form class='form' style='margin:0' id='login_form' action='' method='POST'>"
    + "        <div id='login_form_errors' style='color:red'></div>"

    + "        <div class='control-group' id='login_username'>"
    + "          <label class='control-label'>username  <span class='errors'></span>"
    + "          <input type='text' name='username'/></label>"
    + "        </div>"

    + "        <div class='control-group' id='login_password'>"
    + "          <label class='control-label'>password  <span class='errors'></span>"
    + "          <input type='password' name='password'/></label>"
    + "        </div>"

    + "        <input type='submit' style='margin-top:18px' id='login-submit' class='btn btn-primary'>"
    + "      </form>"

    + "    </div><div class='span3' style='margin-left: 70px'>"
    + "      <h4 style='margin-bottom: 10px'>Create new account</h4>"
    + "      <form class='form' style='margin:0' id='register_form' action='' method='POST'>"
    + "        <div id='register_form_errors' style='color:red'></div>"

    + "        <div class='control-group' id='register_username'>"
    + "          <label class='control-label'>username  <span class='errors'></span>"
    + "          <input type='text' name='username'/></label>"
    + "        </div>"

    + "        <div class='control-group' id='register_password1'>"
    + "          <label class='control-label'>password  <span class='errors'></span>"
    + "          <input type='password' name='password1'/></label>"
    + "        </div>"

    + "        <div class='control-group' id='register_password2'>"
    + "          <label class='control-label'>password (again) <span class='errors'></span>"
    + "          <input type='password' name='password2'/></label>"
    + "        </div>"

    + "        <div class='control-group' id='register_email'>"
    + "          <label class='control-label'>email  <span class='errors'></span>"
    + "          <input type='text' name='email'/></label>"
    + "        </div>"

    + "        <input type='submit' style='margin-top:18px' id='register-submit' class='btn btn-primary'>"
    + "      </form>"
    + "    </div>"
    + "  </div></div>"
    + "</div>",

    events: {
      "click #forgot-link" : "_forgot_clicked",
      "click #forgot-submit" : "_forgot_submitted",
      "click #login-submit" : "_login_submitted",
      "click #register-submit" : "_register_submitted",
    },

    _register_submitted: function () {
      var that = this;
      Backlift.cleanupFormErrors(this, "forgot");
      Backlift.cleanupFormErrors(this, "login");
      Backlift.cleanupFormErrors(this, "register");
      $.ajax({
        type: 'POST',
        url: '/backlift/auth/register',
        data: $('#register_form').serialize(),
        success: this._make_success_fn(),
        error: this._make_error_fn("register"),
      });
      return false;
    },

    _forgot_submitted: function() {
      Backlift.cleanupFormErrors(this, "register");
      return Backlift.LoginView.prototype._login_submitted.call(this);
    },

    _login_submitted: function() {
      Backlift.cleanupFormErrors(this, "register");
      return Backlift.LoginView.prototype._login_submitted.call(this);
    },

  });


  // Backlift.with_user: 
  // A convenience function for handling routes that need access to user data. 
  // Creates a user, shows a login form, and fetches the user model. Calls 
  // do_function once the user model is fetched.
  // 
  // parameters: 
  //   do_function: a function that will be called once the user data has been 
  //   fetched. Should accept one argument, the user model.
  //
  //   create_user (optional): a function that takes two arguments. The first 
  //   will be the user data received from the server that should be used to 
  //   create a backbone model instance. The second is a function that takes 
  //   one argument, the user object, that must be called once the user object 
  //   has been created.
  //
  // Note: The user model's url attribute should be set to 
  // '/backlift/auth/currentuser'. That way you can store custom user data on 
  // the backlift server just by calling save(your_data) on the fetched user 
  // model.
  //
  // Examples: (the following are equivalent)
  //
  //   Backlift.with_user( function (user) {
  //     // create and render user views here
  //   });
  //  
  // -- or --
  //
  //   var create_user = function(data, finished) {
  //     var user = new Backbone.Model(data);
  //     user.url = '/backlift/auth/currentuser';
  //     finished(user);
  //   }
  //
  //   Backlift.with_user( function (user) {
  //     // create and render user views here
  //   }, create_user);

  Backlift.with_user = function (do_function, create_user) {

    if (!Backlift.current_user) {

      var _finished_fn = function(user) {
        Backlift.current_user = user;
        do_function(user);
      }

      var _create_user_fn = function(data) {
        if (create_user) {
          create_user(data, _finished_fn);
        } else {
          new_user = new Backbone.Model(data);
          new_user.url = '/backlift/auth/currentuser';
          _finished_fn(new_user);
        }
      }

      var loginView = new Backlift.LoginRegisterView(_create_user_fn);
      loginView.fetchUser();

    } else {
      do_function(Backlift.current_user);
    }
  };

}).call(this);
