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

namespace mod_studentquiz\local\external;

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/studentquiz/locallib.php');
require_once($CFG->libdir . '/externallib.php');

/**
 * Has comments services implementation.
 *
 * @package mod_studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class has_comments extends external_api {

    /**
     * Gets function parameter metadata.
     *
     * @return external_function_parameters Parameter info
     */
    public static function has_comments_parameters() {
        return new external_function_parameters([
                'questionid' => new external_value(PARAM_INT, 'Question ID'),
                'cmid' => new external_value(PARAM_INT, 'Cm ID'),
        ]);
    }

    /**
     * Returns description of method result values.
     *
     * @return external_single_structure
     */
    public static function has_comments_returns() {
        return new external_single_structure([
                'exists' => new external_value(PARAM_BOOL, 'Check current user has comments, true if quiz is not enforced'),
        ]);
    }

    /**
     * Check if current user has comments.
     *
     * @param int $questionid - Question ID.
     * @param int $cmid - CM ID.
     * @return array
     */
    public static function has_comments($questionid, $cmid) {
        $params = self::validate_parameters(self::has_comments_parameters(), [
                'questionid' => $questionid,
                'cmid' => $cmid
        ]);
        global $DB, $USER;
        $cm = get_coursemodule_from_id('studentquiz', $params['cmid']);
        $context = \context_module::instance($cm->id);
        $studentquiz = mod_studentquiz_load_studentquiz($cm->id, $context->id);
        // If not force commenting, then we don't need to check users has comments.
        if (!$studentquiz->forcecommenting) {
            return ['exists' => true];
        }

        $where = [
                'questionid' => $params['questionid'],
                'userid' => $USER->id,
            // Get comments not deleted.
                'deleted' => 0
        ];
        $exists = $DB->record_exists('studentquiz_comment', $where);
        return compact('exists');
    }
}
