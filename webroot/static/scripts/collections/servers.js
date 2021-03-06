/**
 * BzDeck Server Collection
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Initialize the Server Collection.
 *
 * [argument] none
 * [return] bugs (Object) new instance of the ServerCollection object, when called with `new`
 */
BzDeck.collections.Servers = function ServerCollection () {
  this.datasource = BzDeck.datasources.global;
  this.store_name = 'bugzilla';
  this.model = BzDeck.models.Server;
};

BzDeck.collections.Servers.prototype = Object.create(BzDeck.collections.Base.prototype);
BzDeck.collections.Servers.prototype.constructor = BzDeck.collections.Servers;
