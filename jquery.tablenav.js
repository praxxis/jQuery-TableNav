/**
 * An early stage/proof of concept implementation of a spreadsheet like control based on tables.
 *
 * This implementation was originally conceived before the advent of the fast JavaScript engines that we take for
 * granted today. We needed to scale to a large amount of rows and columns, and creating that many elements purely
 * in JS was exceptionally sluggish. It was decided instead to rely on the internals of the HTML table element, which, by
 * stroke of luck, exposes native `rows` and a `cells` properties. Its child elements, tr and td, also expose coordinate
 * information on where they lie in the table, via `rowIndex` and `cellIndex` respectively.
 *
 * Using native methods, along with the inherit speed in rendering a simple table at the time, meant that we could scale
 * our grid to thousands of rows and columns while maintaining constant performance.
 *
 * @TODO:
 *  - events on table/row/cell selection
 */
(function($) {
	var
		/**
		 * @var object Default settings for the plugin.
		 */
		defaults = {
			navigable_class: 'tn_navigable',
		
			selectable_attribute: 'selectable',

			selected_table_class: 'tn_selected_table',
			selected_cell_class: 'tn_selected_cell',
			selected_row_class: 'tn_selected_row'
		},
		/**
		 * @var object A mixin of the default plugin settings and any user supplied overrides.
		 */
		opts,

		/**
		 * @var jQuery A reference to the currently selected row in the table, as a jQuery object.
		 */
		selected_row,

		/**
		 * @var jQuery A reference to the currently selected cell, as a jQuery object.
		 */
		selected_cell,

		/**
		 * @var jQuery A reference to the active table, as a jQuery object.
		 */
		selected_table,

		/**
		 * @var jQuery The last selected cell. Used as a reference to allow us to remove style infromation.
		 */
		previous_selected_cell,

		/**
		 * @var jQuery As above, for the last selected row.
		 */
		previous_selected_row;

	/**
	 * @param table
	 */
	function _init_table(table) {
		table.toggleClass(opts.navigable_class, true);
	}

	/**
	 * @param table jQuery object
	 */
	function select_table(table) {
		if (!navigable(table)) {
			return false;
		}

		selected_table = table;

		table.toggleClass(opts.selected_table_class, true);

		return true;
	}

	/**
	 * Select the first row in the currently selected table
	 */
	function select_first() {
		move_to_row(0);
	}

	/**
	 * Select a cell in the selected table by its x/y coordinates.
	 * Note that coordinates are **0 indexed**. That is, y=0,x=0 is the first cell in the table.
	 * @param x Horizontal position
	 * @param y Vertical position
	 */
	function select_xy(x, y) {
		var row = selected_table.get(0).rows[y];

		if (!row) {
			return false;
		}

		var cell = row.cells[x];

		if (!cell) {
			return false;
		}

		row = $(row);
		cell = $(cell);

		if (selectable(row) && selectable(cell)) {
			select_row(row);
			select_cell(cell);

			return true;
		}

		return false;
	}

	/**
	 * Return the y coordinate of the currently selected row.
	 * Note that indexes start at **0**.
	 * @return int
	 */
	function current_row_index() {
		return selected_row.get(0).rowIndex;
	}

	/**
	 * Move **index** number of rows up or down the active table. Moves to the first selectable cell once a row is found.
	 * @param index A positive number to move that many rows down, a negative number to move up.
	 * @return bool|null
	 */
	function move_to_row(index) {

		var to,

			flipped = false,
			scroll_to = false,
			trying = 0,

			row,
			rows = selected_table.get(0).rows;

		// @TODO: replace try/catch with proper error handling
		try {
			to = current_row_index() + index;
		} catch(e) {
			to = 0;
		}

		// if we're going beyond the table limit, just select the first row
		if (to < 0) {
			to = 0;
		}

		// we set a hard limit here to stop edge cases such as a table where **every** row is unselectable.
		while (trying < 300) {
			try {
				row = rows[to];
			} catch(e) {
				row = null;
			}

			// no row: out of bounds?
			// flip around and try and find the first accessible row... used when we page up and we're < 20 lines down
			if (!row && !flipped) {

				// if we've hit the edge of the table, 'flip' our way around and find the first selectable row
				if (index > 0) {
					index = -1;
				} else {
					index = 1;
				}

				flipped = true;
				continue;
			}

			if (index >= 0) {
				to++;
			} else {
				to--;
			}

			if (!row) {
				trying++;
				continue;
			}

			row = $(row);

			if (!selectable(row)) {
				continue;
			}

			// we've got our row by now, break out
			break;
		}

		// to stop infinite loops (which should  never actually happen, but HTML can be badly formed, etc) only try a set
		// number of times to alter the row we're in
		if (trying >= 300) {
			return false;
		}

		// if it ends up that we never actually moved rows, don't fire off selection events
		if (selected_row && row.get(0) == selected_row.get(0)) {
			return null;
		}

		if (row.size()) {
			select_row(row);
			// move to the first selectable cell
			move_to_cell(0);
		}

		return true;
	}

	/**
	 * Select a row directly, by passing a jQuery wrapped reference to the tr element.
	 * @param row
	 */
	function select_row(row) {
		if (selected_row && row.get(0) == selected_row.get(0)) {
			return null;
		}

		previous_selected_row = selected_row;

		if (previous_selected_row) {
			previous_selected_row.removeClass(opts.selected_row_class);
		}

		selected_row = row;

		selected_row.toggleClass(opts.selected_row_class, true);

		// @TODO event
		return true;
	}

	/**
	 * Return the x coordinate of the currently selected cell.
	 * Note that indexes start at **0**.
	 * @return int
	 */
	function current_cell_index() {
		return selected_cell.get(0).cellIndex;
	}

	/**
	 * Move **index** number of cells left or right along the active table.
	 * @param index A positive number to move that many cells right, a negative number to move left.
	 * @return bool|null
	 */
	function move_to_cell(index) {
		var to,

			flipped = false,
			trying = 0,

			cell,
			cells = selected_row.get(0).cells;

		// @TODO: replace try/catch with proper error handling
		try {
			to = current_cell_index() + index;
		} catch(e) {
			to = 0;
		}

		while (trying < 300) {
			try {
				cell = cells[to];
			} catch(e) {
				cell = null;
			}

			if (!cell && !flipped) {

				// if we've hit the edge of the table, 'flip' our way around and find the first selectable cell
				if (index > 0 || to >= cells.length) {
					index = -1;
				} else {
					index = 1;
				}

				flipped = true;
				continue;
			}

			if (index > 0) {
				to++;
			} else {
				to--;
			}

			if (!cell) {
				trying++;
				continue;
			}

			cell = $(cell);

			if (!selectable(cell)) {
				continue;
			}

			break;
		}

		// as above
		if (trying >= 300) {
			return false;
		}

		if (selected_cell && cell.get(0) == selected_cell.get(0)) {
			return null;
		}

		if (cell.size()) {
			select_cell(cell);
		}

		return true;
	}

	/**
	 * Select a cell directly by passing a jQuery wrapped td.
	 * @param cell
	 */
	function select_cell(cell) {
		// if we're selecting the same cell, we've nothing to do
		if (selected_cell && cell.get(0) == selected_cell.get(0)) {
			return null;
		}

		// see if we're in the same table still, i.e. when we click away
		// @TODO why are we doing this check here?
		var parent_table = cell.parents('table');
		if (parent_table.get(0) != selected_table.get(0)) {
			select_table(parent_table);
		}

		previous_selected_cell = selected_cell;

		if (previous_selected_cell) {
			previous_selected_cell.removeClass(opts.selected_cell_class);
		}

		selected_cell = cell;

		selected_cell.toggleClass(opts.selected_cell_class, true);

		return true;
	}

	/**
	 * Return whether an element is able to be selected. A un-selectable item will be skipped when trying to move to it.
	 * @param element
	 * @return bool
	 */
	function selectable(element) {

		if (!element) {
			return false;
		}

		if (element.attr(opts.selectable_attribute) == 'false') {
			return false;
		}

		// find the table that this element resides in and make sure it can be navigated to.
		var parent_table = element.parents('table:first');

		if (!navigable(parent_table)) {
			return false;
		}

		return true;
	}

	/**
	 * Whether a table can be navigated to, via direct selection or moving cells/rows.
	 * @param table
	 * @return bool
	 */
	function navigable(table) {
		return table.hasClass(opts.navigable_class);
	}

	/**
	 * Reset and remove any tableNav references and events.
	 */
	function reset() {
		unbind_handlers();

		$('table.' + opts.navigable_class).removeClass(opts.navigable_class);

		if (selected_row) {
			selected_row.removeClass(opts.selected_row_class);
		}

		if (selected_cell) {
			selected_cell.removeClass(opts.selected_cell_class);
		}

		if (selected_table) {
			selected_table.removeClass(opts.selected_table_class);
		}
		
		selected_row = selected_cell = selected_table = null;
	}

	/**
	 * Publicly exposed methods
	 */
	$.tableNav = {
		defaults: defaults,

		selected_row: function get_selected_row() { return selected_row; },
		selected_cell: function get_selected_cell() { return selected_cell; },
		selected_table: function get_selected_table() { return selected_table; },

		select_table: select_table,
		navigable: navigable,

		selectable: selectable,
		select_xy: select_xy,

		move_to_row: move_to_row,
		select_row: select_row,

		move_to_cell: move_to_cell,
		select_cell: select_cell,

		reset: reset
	};

	/**
	 * Event handler called on clicking a navigable table cell/row
	 * @param event
	 */
	function click(event) {
		var cell = $(event.currentTarget);
		var row = cell.parent('tr');

		if (selectable(row) && selectable(cell)) {
			select_row(row);
			select_cell(cell);
		}
	}

	/**
	 * Return whether the keydown event was performed on a navigable item.
	 * @param event
	 */
	function _can_keydown(event) {
		// don't do anything if there are modifiers down
		if (event.shiftKey || event.ctrlKey || event.metaKey) {
			return false;
		}

		var target = $(event.target);

		// don't intercept if we have no element focused
		if (!target.is('html') && target.get(0) != document) {
			// don't intercept if we're not keydowning in an element inside a navigable table

			// if we're not in a table at all, then don't intercept the keydown
			var parents = target.parents('table');

			if (parents.size() === 0) {
				return false;
			}

			// if we're in a table but its not navigable, don't intercept the keydown
			parents = parents.filter(function() {
				return navigable($(this));
			});

			if (parents.size() === 0) {
				return false;
			}
		}

		return true;
	}

	var keycodes = {
		LEFT: 37,
		RIGHT: 39,
		UP: 38,
		DOWN: 40,

		PAGE_UP: 33,
		PAGE_DOWN: 34
	};

	/**
	 * @param keycode
	 * @return bool
	 */
	function _movement_keycode(keycode) {
		keycode = parseInt(keycode);
		return keycode == keycodes.LEFT || keycode == keycodes.RIGHT || keycode == keycodes.UP || keycode == keycodes.DOWN;
	}

	/**
	 * Event handler called on key down.
	 * @param event
	 */
	function keydown(event) {
		var keycode = event.which;
		
		if (!_can_keydown(event) || !_movement_keycode(keycode)) {
			return true;
		}

		switch (keycode) {
			case keycodes.LEFT:
				move_to_cell(-1);
				break;
			case keycodes.RIGHT:
				move_to_cell(1);
				break;
			case keycodes.UP:
				move_to_row(-1);
				break;
			case keycodes.DOWN:
				move_to_row(1);
				break;
		}

		return false;
	}

	function bind_handlers() {
		$('table.' + opts.navigable_class).delegate('td', 'click', function(event) {
			click(event);
		});

		$(document).bind('keydown', keydown);
	}

	function unbind_handlers() {
		$('table.' + opts.navigable_class).undelegate('td', 'click');
		$(document).unbind('keydown', keydown);
	}

	/**
	 * jQuery decorator function.
	 * @param settings
	 */
	$.fn.tableNav = function init(settings) {

		// @TODO: the pesudosingleton nature of these settings consistent
		opts = $.extend({}, defaults, settings);

		// keep a reference to the first table so we can select it later
		var first_table = null;

 		this.each(function() {
			var table = $(this);

			 if (first_table === null) {
				 first_table = table;
			 }

			_init_table(table);
		});

		bind_handlers();

		select_table(first_table);

		select_first();

		return this;
	}

})(jQuery);