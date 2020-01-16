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

/**
 * Unit tests for comment area.
 *
 * @package    mod_studentquiz
 * @copyright  2019 Lam Tran
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die('Direct Access is forbidden!');

use mod_studentquiz\commentarea\comment;

/**
 * Unit tests for comment area.
 *
 * @package    mod_studentquiz
 * @copyright  2019 The Open University
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mod_studentquiz_comment_testcase extends advanced_testcase {

    /**
     * @var stdClass the StudentQuiz activity created in setUp.
     */
    protected $studentquiz;

    /**
     * @var context_module the corresponding activity context.
     */
    protected $context;

    /**
     * @var stdClass the corresponding course_module.
     */
    protected $cm;

    /**
     * @var array the users created in setUp.
     */
    protected $users;

    /**
     * @var array the questions created in setUp.
     */
    protected $questions;

    /** @var mod_studentquiz\commentarea\container */
    protected $commentarea;

    /** @var int - Value of Root comment. */
    protected $rootid;

    /** @var stdClass - Course. */
    protected $course;

    /**
     * Setup for unit test.
     */
    protected function setUp() {
        $this->setAdminUser();
        $this->resetAfterTest();

        global $DB;

        $this->course = $this->getDataGenerator()->create_course();
        $course = $this->course;

        $studentrole = $DB->get_record('role', ['shortname' => 'student']);
        $activity = $this->getDataGenerator()->create_module('studentquiz', array(
                'course' => $course->id,
                'anonymrank' => true,
                'forcecommenting' => 1,
                'publishnewquestion' => 1
        ));
        $this->context = context_module::instance($activity->cmid);
        $this->studentquiz = mod_studentquiz_load_studentquiz($activity->cmid, $this->context->id);
        $this->cm = get_coursemodule_from_id('studentquiz', $activity->cmid);

        // Create user.
        $user = $this->getDataGenerator()->create_user(['firstname' => 'Student 1']);
        $this->getDataGenerator()->enrol_user($user->id, $course->id, $studentrole->id);
        $this->users[] = $user;

        // Create questions in questionbank.
        $questiongenerator = $this->getDataGenerator()->get_plugin_generator('core_question');
        $q1 = $questiongenerator->create_question('truefalse', null,
                ['name' => 'TF1', 'category' => $this->studentquiz->categoryid]);
        $q1 = \question_bank::load_question($q1->id);
        $this->questions = [$q1];

        $this->commentarea = new \mod_studentquiz\commentarea\container($this->studentquiz, $q1, $this->cm, $this->context, $user);
        $this->rootid = \mod_studentquiz\commentarea\container::PARENTID;
    }

    /**
     * @param int $id - Comment ID.
     * @param bool $convert - Is convert to object data.
     * @return comment|stdClass
     */
    private function get_comment_by_id ($id, $convert = true) {
        $comment = $this->commentarea->query_comment_by_id($id);
        if ($convert) {
            $comment = $comment->convert_to_object();
        }
        return $comment;
    }

    /**
     * Create a comment.
     *
     * @param int $replyto - Parent ID of comment.
     * @param int $questionid - Question ID.
     * @param string $text - Text of comment.
     * @param bool $convert - Is convert to object data.
     * @return comment
     */
    private function create_comment($replyto, $questionid, $text, $convert = true) {
        $data = [
                'message' => [
                        'text' => $text,
                        'format' => 1
                ],
                'questionid' => $questionid,
                'cmid' => $this->cm->id,
                'replyto' => $replyto
        ];
        $id = $this->commentarea->create_comment((object) $data);
        return $this->get_comment_by_id($id, $convert);
    }

    /**
     * Test init comment area.
     */
    public function test_initial() {
        $question = $this->questions[0];
        $this->equalTo($question->id, $this->commentarea->get_question()->id);
        $this->equalTo($this->cm->id, $this->commentarea->get_cmid());
        $this->equalTo($this->studentquiz->id, $this->commentarea->get_studentquiz()->id);
        $this->equalTo($this->context->id, $this->commentarea->get_context()->id);
    }

    /**
     * Test create root comment
     */
    public function test_create_root_comment() {
        // Create root comment.
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        $this->assertEquals($text, $comment->content);
        $this->assertEquals($q1->id, $comment->questionid);
        $this->assertEquals($this->rootid, $comment->parentid);
    }

    /**
     * Test create reply.
     */
    public function test_create_reply_comment() {
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $textreply = 'Reply root comment';
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        $reply = $this->create_comment($comment->id, $q1->id, $textreply);
        // Check text reply.
        $this->assertEquals($textreply, $reply->content);
        // Check question id.
        $this->assertEquals($q1->id, $reply->questionid);
        // Check if reply belongs to comment.
        $this->assertEquals($comment->id, $reply->parentid);
    }

    /**
     * Test delete comment.
     */
    public function test_delete_comment() {
        // Create root comment.
        $q1 = $this->questions[0];
        $user = $this->users[0];
        $text = 'Root comment';
        // Dont need to convert to use delete.
        $comment = $this->create_comment($this->rootid, $q1->id, $text, false);
        // Try to delete.
        $comment->delete();
        // Get new data.
        $commentafterdelete = $this->get_comment_by_id($comment->get_id(), false);;
        // Delete time now is > 0 (deleted).
        $this->assertTrue($commentafterdelete->get_comment_data()->deleted > 0);
        // Check correct delete user id.
        $this->assertEquals($user->id, $commentafterdelete->get_delete_user()->id);
    }

    /**
     * Test fetch all comments.
     */
    public function test_fetch_all_comments() {
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $textreply = 'Reply root comment';
        $numreplies = 3;
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        for ($i = 0; $i < $numreplies; $i++) {
            $this->create_comment($comment->id, $q1->id, $textreply);
        }
        $comments = $this->commentarea->fetch_all(0);

        $data = [];
        foreach ($comments as $comment) {
            $item = $comment->convert_to_object();
            $item->replies = [];
            foreach ($comment->get_replies() as $reply) {
                $item->replies[] = $reply->convert_to_object();
            }
            $data[] = $item;
        }
        // Check total comments.
        $this->assertEquals($numreplies + 1, $this->commentarea->get_num_comments());
        // Check root comment has 3 replies.
        foreach ($data as $v) {
            $this->assertEquals($numreplies, $v->numberofreply);
        }
    }
}
