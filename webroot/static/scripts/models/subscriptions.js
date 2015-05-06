/**
 * BzDeck Subscriptions Model
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Initialize the Subscriptions Model.
 *
 * [argument] none
 * [return] subscriptions (Object) new instance of the SubscriptionsModel object, when an instance is created
 */
BzDeck.models.Subscriptions = function SubscriptionsModel () {
};

BzDeck.models.Subscriptions.prototype = Object.create(BzDeck.models.Base.prototype);
BzDeck.models.Subscriptions.prototype.constructor = BzDeck.models.Subscriptions;

/*
 * Get bugs the user is involving, with a specific key.
 *
 * [argument] id (String) key of the subscription
 * [return] bugs (Promise -> Map) new instances of the BugModel object
 */
BzDeck.models.Subscriptions.prototype.get = function (id) {
  let severities = ['blocker', 'critical', 'major'],
      email = BzDeck.models.account.data.name;

  if (['all', 'inbox', 'important'].includes(id)) {
    return this.get_all().then(bugs => {
      if (id === 'inbox') {
        // Recent bugs changed in 10 days + unread bugs
        bugs = new Map([for (bug of bugs.values()) if (bug.is_new) [bug.id, bug]]);
      }

      if (id === 'important') {
        bugs = new Map([for (bug of bugs.values()) if (severities.includes(bug.severity)) [bug.id, bug]]);
      }

      return Promise.resolve(bugs);
    });
  }

  return BzDeck.models.bugs.get_all().then(bugs => {
    if (id === 'watching') {
      bugs = new Map([for (bug of bugs.values()) if (bug.cc && bug.cc.includes(email)) [bug.id, bug]]);
    }

    if (id === 'reported') {
      bugs = new Map([for (bug of bugs.values()) if (bug.creator === email) [bug.id, bug]]);
    }

    if (id === 'assigned') {
      bugs = new Map([for (bug of bugs.values()) if (bug.assigned_to === email) [bug.id, bug]]);
    }

    if (id === 'mentor') {
      bugs = new Map([for (bug of bugs.values()) if (bug.mentors && bug.mentors.includes(email)) [bug.id, bug]]);
    }

    if (id === 'qa') {
      bugs = new Map([for (bug of bugs.values()) if (bug.qa_contact === email) [bug.id, bug]]);
    }

    if (id === 'requests') {
      bugs = new Map([for (bug of bugs.values())
                      for (flag of bug.flags || []) if (flag.requestee === email) [bug.id, bug]]);
    }

    if (id === 'starred') {
      // Starred bugs may include non-subscribed bugs, so get all bugs, not only subscriptions
      bugs = new Map([for (bug of bugs.values()) if (bug.starred) [bug.id, bug]]);
    }

    bugs = new Map([for (bug of bugs.values()) if (!!bug.data._tags && bug.data._tags.has(id)) [bug.id, bug]]);
    
    return Promise.resolve(bugs);
  });
};

/*
 * Get all bugs the user is involving.
 *
 * [argument] none
 * [return] bugs (Promise -> Map) new instances of the BugModel object
 */
BzDeck.models.Subscriptions.prototype.get_all = function () {
  let email = BzDeck.models.account.data.name;

  return BzDeck.models.bugs.get_all().then(bugs => Promise.resolve(new Map([for (bug of bugs.values())
      if ((bug.cc && bug.cc.includes(email)) || bug.creator === email || bug.assigned_to === email ||
          (bug.mentors && bug.mentors.includes(email)) || bug.qa_contact === email ||
          [for (flag of bug.flags || []) if (flag.requestee === email) flag].length) [bug.id, bug]])));
};

/*
 * Retrieve data of bugs the user is involving, from Bugzilla.
 *
 * [argument] none
 * [return] bugs (Promise -> Array(Object) or Error) new instances of the BugModel object
 */
BzDeck.models.Subscriptions.prototype.fetch = function () {
  let prefs = BzDeck.models.prefs.data,
      last_loaded = prefs['subscriptions.last_loaded'],
      firstrun = !last_loaded,
      params = new URLSearchParams(),
      fields = ['cc', 'reporter', 'assigned_to', 'qa_contact', 'bug_mentor', 'requestees.login_name'];

  params.append('j_top', 'OR');

  if (last_loaded) {
    let date = FlareTail.util.datetime.get_shifted_date(new Date(last_loaded), BzDeck.models.server.data.timezone);

    params.append('include_fields', 'id');
    params.append('chfieldfrom', date.toLocaleFormat('%Y-%m-%d %T'));
  } else {
    // Fetch only solved bugs at initial startup
    params.append('resolution', '---');
  }

  for (let [i, name] of fields.entries()) {
    params.append(`f${i}`, name);
    params.append(`o${i}`, 'equals');
    params.append(`v${i}`, BzDeck.models.account.data.name);
  }

  return BzDeck.models.bugs.get_all().then(cached_bugs => {
    // Append starred bugs to the query
    params.append('f9', 'bug_id');
    params.append('o9', 'anywords');
    params.append('v9', [for (bug of cached_bugs.values()) if (bug.starred) bug.id].join());
  }).then(() => {
    BzDeck.controllers.global.request('bug', params).then(result => {
      last_loaded = prefs['subscriptions.last_loaded'] = Date.now();

      if (firstrun) {
        return Promise.all(result.bugs.map(_bug => {
          // Mark all bugs read if the session is firstrun
          _bug.unread = false;

          return new BzDeck.models.Bug(_bug);
        }));
      }

      if (result.bugs.length) {
        return BzDeck.models.bugs.fetch([for (_bug of result.bugs) _bug.id])
            .then(_bugs => Promise.all(_bugs.map(_bug => BzDeck.models.bugs.get(_bug.id).then(bug => bug.merge(_bug)))))
            .then(bugs => { this.trigger('Bugs:Updated', { bugs }); return bugs; });
      }

      return Promise.all([]);
    }).then(bugs => Promise.resolve(bugs), event => Promise.reject(new Error('Failed to load data.'))); // l10n
  });
};

BzDeck.models.Subscriptions.prototype.get_tags = function() {
  return BzDeck.models.bugs.get_all().then(bugs => {
    var tags = new Set();
    for (var bug of bugs.values()) {
      if (!!bug.data._tags){
        bug.data._tags.forEach(tag => tags.add(tag));
      }
    }
    return Promise.resolve(tags)
  });
};
