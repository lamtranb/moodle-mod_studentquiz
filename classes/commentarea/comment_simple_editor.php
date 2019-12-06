<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace mod_studentquiz\commentarea;


defined('MOODLE_INTERNAL') || die;

use MoodleQuickForm_editor;

/**
 * Hacky form for a simple editor with custom option.
 *
 * @package mod_studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class comment_simple_editor extends MoodleQuickForm_editor {

    /**
     * comment_simple_editor constructor.
     *
     * @param null $elementname - Name of element
     * @param null $elementlabel - Label of element
     * @param null $attributes - Attributes of element
     * @param null $options - Options of element
     */
    public function __construct($elementname = null, $elementlabel = null, $attributes = null, $options = null) {
        $this->_options['atto:toolbar'] = '';
        parent::__construct($elementname, $elementlabel, $attributes, $options);
    }
}
