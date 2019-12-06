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
use mod_studentquiz\commentarea\comment_form;
use mod_studentquiz\commentarea\question;
use mod_studentquiz\utils;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/studentquiz/locallib.php');
require_once($CFG->libdir . '/externallib.php');

/**
 * Create comment services implementation.
 *
 * @package mod_studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class create_comment extends external_api {

    /**
     * Gets function parameter metadata.
     *
     * @return external_function_parameters Parameter info
     */
    public static function create_comment_parameters() {
        return new external_function_parameters([
                'questionid' => new external_value(PARAM_INT, 'Question ID'),
                'cmid' => new external_value(PARAM_INT, 'Cm ID'),
                'replyto' => new external_value(PARAM_INT, 'Comment ID to to reply.'),
                'message' => new external_function_parameters([
                        'text' => new external_value(PARAM_RAW, 'Message of the post'),
                        'format' => new external_value(PARAM_TEXT, 'Format of the message')
                ]),
        ]);
    }

    /**
     * Returns description of method result values.
     *
     * @return external_single_structure
     */
    public static function create_comment_returns() {
        $replystructure = utils::get_comment_area_webservice_comment_reply_structure();
        return new external_single_structure($replystructure);
    }

    /**
     * Get comments belong to question.
     *
     * @param int $questionid - ID of question.
     * @param int $cmid - ID of CM
     * @param int $replyto - ID of comment reply to (0 if top level comment).
     * @param string $message - Comment message.
     * @return \stdClass
     */
    public static function create_comment($questionid, $cmid, $replyto, $message) {

        $params = self::validate_parameters(self::create_comment_parameters(), [
                'questionid' => $questionid,
                'cmid' => $cmid,
                'replyto' => $replyto,
                'message' => $message
        ]);

        list($question, $cm, $context, $studentquiz) = utils::get_data_for_comment_area($params['questionid'], $params['cmid']);
        $commentarea = new question($studentquiz, $question, $cm, $context);

        if ($params['replyto'] != 0) {
            $replytocomment = $commentarea->query_comment_by_id($params['replyto']);
            if (!$replytocomment->can_reply()) {
                throw  new \moodle_exception($replytocomment->get_describe());
            }
        }

        global $PAGE;
        $PAGE->set_context($context);

        $formdata = [
                'message' => $message,
                '_qf__mod_studentquiz_commentarea_comment_form' => 1
        ];

        // Assign data to edit post form, this will also check for session key.
        $mform = new comment_form('', array(
                'params' => [
                        'questionid' => $params['questionid'],
                        'cmid' => $params['cmid'],
                        'replyto' => $params['replyto'],
                ]
        ), 'post', '', null, true, $formdata);

        // Validate form data.
        $validatedata = $mform->get_data();

        if (!$validatedata) {
            $errors = array_merge($mform->validation($formdata, []), $mform->get_form_errors());
            throw new \moodle_exception('error_form_validation', 'mod_studentquiz', '', json_encode($errors));
        }

        // Create comment.
        $id = $commentarea->create_comment($validatedata);
        $comment = $commentarea->query_comment_by_id($id);
        $data = $comment->convert_to_object();

        return $data;
    }
}
