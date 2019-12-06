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
namespace mod_studentquiz;

defined('MOODLE_INTERNAL') || die();

use external_value;
use external_single_structure;
/**
 * Class that holds utility functions used by mod_studentquiz.
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class utils {

    /**
     * Get Comment Area web service comment reply structure.
     *
     * @return array
     */
    public static function get_comment_area_webservice_comment_reply_structure() {
        return [
                'id' => new external_value(PARAM_INT, 'Comment ID'),
                'questionid' => new external_value(PARAM_INT, 'Question ID'),
                'parentid' => new external_value(PARAM_INT, 'Parent comment ID'),
                'content' => new external_value(PARAM_RAW, 'Comment content'),
                'shortcontent' => new external_value(PARAM_RAW, 'Comment short content'),
                'numberofreply' => new external_value(PARAM_INT, 'Number of reply for this comment'),
                'authorname' => new external_value(PARAM_TEXT, 'Author of this comment'),
                'authorid' => new external_value(PARAM_INT, 'ID of the user who created this comment'),
                'authorprofile' => new external_value(PARAM_TEXT, 'Author profile URL'),
                'posttime' => new external_value(PARAM_RAW, 'Comment create time'),
                'lastedittime' => new external_value(PARAM_RAW, 'Comment last edit time'),
                'deletedtime' => new external_value(PARAM_RAW, 'Comment edited time, if not deleted return 0'),
                'deleteuser' => new external_single_structure([
                        'id' => new external_value(PARAM_TEXT, 'ID of delete user'),
                        'firstname' => new external_value(PARAM_TEXT, 'Delete user first name'),
                        'lastname' => new external_value(PARAM_TEXT, 'Delete user last name'),
                        'profileurl' => new external_value(PARAM_RAW, 'URL lead to delete user profile page'),
                ]),
                'canedit' => new external_value(PARAM_BOOL, 'Can edit this comment or not.'),
                'candelete' => new external_value(PARAM_BOOL, 'Can delete this comment or not.'),
                'canreport' => new external_value(PARAM_BOOL, 'Can report this comment or not.'),
                'canundelete' => new external_value(PARAM_BOOL, 'Can undelete this comment or not.'),
                'canviewdeleted' => new external_value(PARAM_BOOL, 'Can view deleted comment.'),
                'canreply' => new external_value(PARAM_BOOL, 'Can reply this comment or not.'),
                'reportlink' => new external_value(PARAM_RAW, 'Link lead to report page.', VALUE_DEFAULT, ''),
                'rownumber' => new external_value(PARAM_INT, 'Row number of comment.'),
                'iscreator' => new external_value(PARAM_BOOL, 'Check if this comment belongs to current logged in user.')
        ];
    }

    /**
     * Loops through all the fields of an object, removing those which begin
     * with a given prefix, and setting them as fields of a new object.
     * @param &$object object Object
     * @param $prefix string Prefix e.g. 'prefix_'
     * @return object Object containing all the prefixed fields (without prefix)
     */
    public static function extract_subobject(&$object, $prefix) {
        $result = [];
        foreach ((array)$object as $key => $value) {
            if (strpos($key, $prefix) === 0) {
                $result[substr($key, strlen($prefix))] = $value;
                unset($object->{$key});
            }
        }
        return (object)$result;
    }

    /**
     * Used when selecting users inside other SQL statements.
     * Returns list of fields suitable to go within the SQL SELECT block. For
     * example, if the alias is 'fu', one field will be fu.username AS fu_username.
     * Note, does not end in a comma.
     * @param string $alias Alias of table to extract
     * @param bool $includemailfields If true, includes additional fields
     *   needed for sending emails
     * @return string SQL select fields (no comma at start or end)
     */
    public static function select_username_fields($alias, $includemailfields = false) {
        return self::select_fields(
                self::get_username_fields($includemailfields), $alias);
    }

    /**
     * Makes a list of fields with alias in front.
     * @param $fields
     * @param string $alias - Table alias (also used as field prefix) - leave blank for none
     * @return mixed
     */
    private static function select_fields($fields, $alias = '') {
        $result = '';
        if ($alias === '') {
            $fieldprefix = '';
            $nameprefix = '';
        } else {
            $fieldprefix = $alias . '.';
            $nameprefix = $alias . '_';
        }
        foreach ($fields as $field) {
            if ($result) {
                $result .= ',';
            }
            $result .= $fieldprefix . $field . ' as ' . $nameprefix . $field;
        }
        return $result;
    }

    /**
     * @param bool $includemailfields If true, includes email fields (loads)
     * @return array List of all field names in mdl_user to include
     */
    public static function get_username_fields($includemailfields = false) {
        // Get core user name fields, for use with fullname etc.
        $namefields = get_all_user_name_fields();
        $fields = array_merge(['id', 'username', 'picture', 'url', 'imagealt', 'idnumber', 'email'], $namefields);
        $emailfields = ['maildisplay', 'mailformat', 'maildigest', 'emailstop', 'deleted', 'auth', 'timezone', 'lang'];
        if ($includemailfields) {
            $fields = array_merge($fields, $emailfields);
        }
        return array_unique($fields);
    }

    /**
     * Truncate text
     *
     * @todo Should replace line 156 preg_replace('!\s+!', ' ', $text) => mb_ereg_replace for utf8.
     * @param $text - Full text
     * @param int $length - Max length of text
     * @return string
     * @throws \coding_exception
     */
    public static function nice_shorten_text($text, $length = 40) {
        $text = trim($text);
        // Replace image tag by placeholder text.
        $text = preg_replace('/<img.*?>/', get_string('image_placeholder', 'mod_studentquiz'), $text);
        $text = mb_convert_encoding($text, "HTML-ENTITIES", "UTF-8");
        // Trim the multiple spaces to single space and multiple lines to one line.
        $text = preg_replace('!\s+!', ' ', $text);
        $summary = shorten_text($text, $length);
        $summary = preg_replace('~\s*\.\.\.(<[^>]*>)*$~', '$1', $summary);
        $dots = $summary != $text ? '...' : '';
        return $summary . $dots;
    }

    /**
     * Get data need for comment area
     *
     * @param $questionid
     * @param $cmid
     * @return array
     */
    public static function get_data_for_comment_area($questionid, $cmid) {
        $cm = get_coursemodule_from_id('studentquiz', $cmid);
        $context = \context_module::instance($cm->id);
        $studentquiz = mod_studentquiz_load_studentquiz($cmid, $context->id);
        $question = \question_bank::load_question($questionid);
        return [$question, $cm, $context, $studentquiz];
    }
}
