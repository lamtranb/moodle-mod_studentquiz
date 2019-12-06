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
use mod_studentquiz\commentarea\question;
use mod_studentquiz\utils;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/studentquiz/locallib.php');
require_once($CFG->libdir . '/externallib.php');

/**
 * Undelete services implementation.
 *
 * @package mod_studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class undelete_comment extends external_api {

    /**
     * Gets function parameter metadata.
     *
     * @return external_function_parameters Parameter info
     */
    public static function undelete_comment_parameters() {
        return new external_function_parameters([
                'questionid' => new external_value(PARAM_INT, 'Question ID'),
                'cmid' => new external_value(PARAM_INT, 'Cm ID'),
                'commentid' => new external_value(PARAM_INT, 'Comment ID'),
        ]);
    }

    /**
     * Returns description of method result values.
     *
     * @return external_single_structure
     */
    public static function undelete_comment_returns() {
        $replystructure = utils::get_comment_area_webservice_comment_reply_structure();

        return new external_single_structure([
                'success' => new external_value(PARAM_BOOL, 'Delete comment successfully or not.'),
                'message' => new external_value(PARAM_TEXT, 'Message in case delete comment failed.'),
                'postinfo' => new external_single_structure($replystructure, '', VALUE_DEFAULT, null)
        ]);
    }

    /**
     * Check permission and undelete comment.
     *
     * @param int $questionid - Question ID.
     * @param int $cmid - Cm ID.
     * @param int $commentid - Comment ID.
     * @return mixed
     */
    public static function undelete_comment($questionid, $cmid, $commentid) {

        // Validate web service's parammeters.
        $params = self::validate_parameters(self::undelete_comment_parameters(), array(
                'questionid' => $questionid,
                'cmid' => $cmid,
                'commentid' => $commentid
        ));

        list($question, $cm, $context, $studentquiz) = utils::get_data_for_comment_area($params['questionid'], $params['cmid']);
        $commentarea = new question($studentquiz, $question, $cm, $context);

        $comment = $commentarea->query_comment_by_id($params['commentid']);

        $response = new \stdClass();
        // Check if current user can delete the post.
        if ($comment->can_undelete()) {
            // Delete the post.
            $comment->undelete();

            // Fetch data from DB to have correct info.
            $comment = $commentarea->query_comment_by_id($params['commentid']);

            $response->success = true;
            $response->message = 'Success';
            $response->postinfo = $comment->convert_to_object();
        } else {
            // User can't delete comment, return reason.
            $response->success = false;
            $response->message = $comment->get_describe();
        }

        return $response;
    }
}
