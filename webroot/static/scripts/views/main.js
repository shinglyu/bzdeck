/**
 * BzDeck Main Views
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 */

'use strict';

let BzDeck = BzDeck || {};

BzDeck.views = BzDeck.views || {};
BzDeck.views.pages = {};
BzDeck.views.components = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Core
 * ------------------------------------------------------------------------------------------------------------------ */

BzDeck.views.core = {}

BzDeck.views.core.init = function () {
  this.show_status('Loading UI...'); // l10n

  let datetime = FlareTail.util.datetime,
      prefs = BzDeck.model.data.prefs,
      value,
      theme = prefs['ui.theme.selected'],
      FTut = FlareTail.util.theme,
      $root = document.documentElement;

  // Automatically update relative dates on the app
  datetime.options.updater_enabled = true;

  // Date format
  value = prefs['ui.date.relative'];
  datetime.options.relative = value !== undefined ? value : true;

  // Date timezone
  value = prefs['ui.date.timezone'];
  datetime.options.timezone = value || 'local';

  // Timeline: Font
  value = prefs['ui.timeline.font.family'];
  $root.setAttribute('data-timeline-font-family', value || 'proportional');

  // Timeline: Sort order
  value = prefs['ui.timeline.sort.order'];
  $root.setAttribute('data-timeline-sort-order', value || 'ascending');

  // Timeline: Changes
  value = prefs['ui.timeline.show_cc_changes'];
  $root.setAttribute('data-timeline-show-cc-changes', value !== undefined ? value : false);

  // Timeline: Attachments
  value = prefs['ui.timeline.display_attachments_inline'];
  $root.setAttribute('data-timeline-display-attachments-inline', value !== undefined ? value : true);

  // Activate widgets
  BzDeck.views.pages.home = new BzDeck.views.HomePage();
  BzDeck.views.components.toolbar = new BzDeck.views.Toolbar();
  BzDeck.views.components.sidebar = new BzDeck.views.Sidebar();
  // BzDeck.views.DetailsPage.swipe.init();

  // Change the theme
  if (theme && FTut.list.contains(theme)) {
    FTut.selected = theme;
  }

  // Preload images from CSS
  FTut.preload_images();
};

BzDeck.views.core.show_status = function (message) {
  if (this.$statusbar) {
    this.$statusbar.textContent = message;
  }
};

BzDeck.views.core.toggle_unread = function (loaded = false) {
  BzDeck.model.get_all_bugs().then(bugs => {
    bugs = [for (bug of bugs) if (bug._unread) bug];

    if (document.documentElement.getAttribute('data-current-tab') === 'home') {
      let unread_num = [for (bug of BzDeck.views.pages.home.data.bugs) if (bug._unread) bug].length;

      BzDeck.views.pages.home.update_window_title(
        document.title.replace(/(\s\(\d+\))?$/, unread_num ? ` (${unread_num})` : '')
      );
    }

    if (!loaded) {
      return;
    }

    if (bugs.length === 0) {
      this.show_status('No new bugs to download'); // l10n

      return;
    }

    bugs.sort((a, b) => new Date(b.last_change_time) - new Date(a.last_change_time));

    let status = bugs.length > 1 ? `You have ${bugs.length} unread bugs` : 'You have 1 unread bug', // l10n
        extract = [for (bug of bugs.slice(0, 3)) `${bug.id} - ${bug.summary}`].join('\n');

    this.show_status(status);

    // Select Inbox when the notification is clicked
    BzDeck.controllers.core.show_notification(status, extract).then(event => BzDeck.router.navigate('/home/inbox'));
  });
};

BzDeck.views.core.set_avatar = function (person, $image) {
  let $_image = new Image();

  $image.alt = BzDeck.controllers.users.get_name(person).match(/^[\[\(\:]?(.)/)[1].toUpperCase();
  $image.style.setProperty('background-color', BzDeck.controllers.users.get_color(person));
  $_image.addEventListener('load', event => {
    if ($image) {
      $image.style.removeProperty('background-color');
      $image.src = $_image.src;
    }
  });
  $_image.src = `https://secure.gravatar.com/avatar/${md5(person.email)}?d=404&s=160`;
};

BzDeck.views.core.update_window_title = $tab => {
  if ($tab.id === 'tab-home') {
    BzDeck.views.pages.home.update_window_title($tab.title);
  } else {
    document.title = $tab.title.replace('\n', ' – ');
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * Session
 * ------------------------------------------------------------------------------------------------------------------ */

BzDeck.views.session = {};

BzDeck.views.session.login = function () {
  BzDeck.views.core.$statusbar = document.querySelector('#statusbar');

  this.$app_login = document.querySelector('#app-login'),
  this.$app_body = document.querySelector('#app-body');

  this.$app_login.setAttribute('aria-hidden', 'true');
  this.$app_body.removeAttribute('aria-hidden');

  // TODO: focus handling
};

BzDeck.views.session.logout = function () {
  BzDeck.views.core.$statusbar = $app_login.querySelector('[role="status"]');
  BzDeck.views.core.show_status('You have logged out.'); // l10n

  this.$app_login.removeAttribute('aria-hidden');
  this.$app_body.setAttribute('aria-hidden', 'true');

  BzDeck.controllers.bootstrap.show_login_form(false);
};

/* ------------------------------------------------------------------------------------------------------------------
 * Log-in Form
 * ------------------------------------------------------------------------------------------------------------------ */

BzDeck.views.LoginForm = function LoginForm () {
  this.$form = document.querySelector('#app-login form');
  this.$input = this.$form.querySelector('[role="textbox"]');
  this.$button = this.$form.querySelector('[role="button"]');
  this.$statusbar = document.querySelector('#app-login [role="status"]');
};

BzDeck.views.LoginForm.prototype.show = function (firstrun = true) {
  this.$form.setAttribute('aria-hidden', 'false');
  this.$input.disabled = this.$button.disabled = false;
  this.$input.focus();

  if (!firstrun) {
    return true;
  }

  return new Promise((resolve, reject) => {
    this.$form.addEventListener('submit', event => {
      if (!BzDeck.controllers.bootstrap.processing) {
        // User is trying to re-login
        BzDeck.controllers.bootstrap.relogin = true;
        BzDeck.controllers.bootstrap.processing = true;
      }

      if (navigator.onLine) {
        this.$input.disabled = this.$button.disabled = true;
        resolve(this.form.$input.value);
      } else {
        reject(new Error('You have to go online to sign in.')); // l10n
      }

      event.preventDefault();

      return false;
    });
  });
};

BzDeck.views.LoginForm.prototype.hide = function () {
  this.$form.setAttribute('aria-hidden', 'true');
};

BzDeck.views.LoginForm.prototype.show_status = function (message) {
  this.$statusbar.textContent = message;
};

BzDeck.views.LoginForm.prototype.enable_input = function () {
  this.form.$input.disabled = this.form.$button.disabled = false;
};

BzDeck.views.LoginForm.prototype.disable_input = function () {
  this.form.$input.disabled = this.form.$button.disabled = true;
};

/* ------------------------------------------------------------------------------------------------------------------
 * Events
 * ------------------------------------------------------------------------------------------------------------------ */

window.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('dragenter', event => event.preventDefault());
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
window.addEventListener('wheel', event => event.preventDefault());

window.addEventListener('popstate', event => {
  // Hide sidebar
  if (FlareTail.util.ua.device.mobile) {
    document.documentElement.setAttribute('data-sidebar-hidden', 'true');
    document.querySelector('#sidebar').setAttribute('aria-hidden', 'true');
  }
});

window.addEventListener('click', event => {
  let $target = event.target;

  // Discard clicks on the fullscreen dialog
  if ($target === document) {
    return true;
  }

  if ($target.matches('[itemtype$="Person"]')) {
    BzDeck.router.navigate('/profile/' + $target.properties.email[0].itemValue);
    event.stopPropagation();
    event.preventDefault();

    return false;
  }

  if ($target.matches(':link')) {
    // Bug link: open in a new app tab
    if ($target.hasAttribute('data-bug-id')) {
      BzDeck.router.navigate('/bug/' + $target.getAttribute('data-bug-id'));

      event.preventDefault();

      return false;
    }

    // Attachment link: open in a new browser tab (TEMP)
    if ($target.hasAttribute('data-attachment-id')) {
      window.open(BzDeck.model.data.server.url + '/attachment.cgi?id='
                   + $target.getAttribute('data-attachment-id'), '_blank');

      event.preventDefault();

      return false;
    }

    // Normal link: open in a new browser tab
    $target.target = '_blank';

    return false;
  }

  return true;
});

window.addEventListener('keydown', event => {
  let modifiers = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey,
      tab = event.keyCode === event.DOM_VK_TAB;

  // Stop showing the Search Bar in Firefox
  if (!event.target.matches('[role="textbox"]') && !modifiers && !tab) {
    event.preventDefault();
  }
});

window.addEventListener('Bug:UnreadToggled', event => {
  BzDeck.views.core.toggle_unread();
});
