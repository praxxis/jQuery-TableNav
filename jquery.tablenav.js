/**
 * @TODO:
 *  - events on table/row/cell selection
 */
(function($) {
	var defaults = {
			navigable_class: 'tn_navigable',
		
			selectable_attribute: 'selectable',

			selected_table_class: 'tn_selected_table',
			selected_cell_class: 'tn_selected_cell',
			selected_row_class: 'tn_selected_row'
		},
		opts,

		selected_row,
		selected_cell,
		selected_table,

		previous_selected_cell,
		previous_selected_row,

		jump_tables_selection = true;

	function _init_table(table) {
		table.toggleClass(opts.navigable_class, true);
	}

	function select_table(table) {
		selected_table = table;

		table.toggleClass(opts.selected_table_class, true);
	}

	function select_first() {
		move_to_row(0);
	}

	function current_row_index() {
		return selected_row.get(0).rowIndex;
	}

	function move_to_row(index) {

		var to,

			flipped = false,
			scroll_to = false,
			trying = 0,

			row,
			rows = selected_table.get(0).rows;

		try {
			to = current_row_index() + index;
		} catch(e) {
			to = 0;
		}

		// if we're going beyond the table limit, just select the first row
		if (to < 0) {
			to = 0;
		}

		while (trying < 300) {
			try {
				row = rows[to];
			} catch(e) {
				row = null;
			}

			// out of bounds? flip around and try and find the first accessible row... used when we page up and we're < 20 lines down
			if (!row && !flipped) {

				// hit the very top or bottom, make sure everything is visible
				/*if (scroll_to) {
					this.scroll_to(scroll_to);
				}*/

				// if we've hit the boundary of the table, 'flip' our way around and find the first selectable row
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

			// we've got our row by here, break out
			break;
		}

		// to stop infinite loops (which should  never actually happen, but HTML can be badly formed...) only try a set
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

	function current_cell_index() {
		return selected_cell.get(0).cellIndex;
	}

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

				// if we've hit the boundary of the table, 'flip' our way around and find the first selectable cell
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

		// @TODO event

		// @TODO
		//scrollToIfNeccessary(this.current_cell_dom);

		return true;
	}

	function selectable(element) {

		if (!element) {
			return false;
		}

		if (element.attr(opts.selectable_attribute) == 'false') {
			return false;
		}

		var parent_table = element.parents('table:first');

		if (!navigable(parent_table)) {
			return false;
		}

		return true;
	}

	function navigable(table) {
		return table.hasClass(opts.navigable_class);
	}

	function reset() {
		unbind_handlers();
		$('table.' + opts.navigable_class).removeClass(opts.navigable_class);
		selected_row = selected_cell = selected_table = null;
	}

	$.tableNav = {
		defaults: defaults,

		selected_row: function get_selected_row() { return selected_row; },
		selected_cell: function get_selected_cell() { return selected_cell; },
		selected_table: function get_selected_table() { return selected_table; },

		select_table: select_table,
		navigable: navigable,

		selectable: selectable,

		move_to_row: move_to_row,
		select_row: select_row,

		move_to_cell: move_to_cell,
		select_cell: select_cell,

		reset: reset
	};

	function click(event) {
		var cell = $(event.currentTarget);
		var row = cell.parent('tr');

		if (selectable(row) && selectable(cell)) {
			select_row(row);
			select_cell(cell);
		}
	}

	function _can_keydown(event) {
		// don't do anything if there are modifiers down
		if (event.shiftKey || event.ctrlKey || event.metaKey) {
			return false;
		}

		// don't catch key presses when we're inside a form element in a non-navigable table
		var target = $(event.target);
		if (target.size() && target.is('input')) {
			var parent_table = target.parents('table:first');
			if (!navigable(parent_table)) {
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

	function _movement_keycode(keycode) {
		keycode = parseInt(keycode);
		return keycode == keycodes.LEFT || keycode == keycodes.RIGHT || keycode == keycodes.UP || keycode == keycodes.DOWN;
	}

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
		})

		$(document).bind('keydown', function(event) {
			return keydown(event);
		});
	}

	function unbind_handlers() {
		$('table.' + opts.navigable_class).undelegate('td', 'click');
	}

	$.fn.tableNav = function init(settings) {

		// @TODO: work out the pesudosingleton nature of these settings
		opts = $.extend({}, defaults, settings);

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